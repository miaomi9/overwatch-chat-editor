'use client';

import React, { useRef, useEffect, useState } from 'react';
import { parseOverwatchCode } from '@/utils/overwatchCodeParser';
import { loadTexturesWithCache, type Texture } from '@/utils/textureCache';

interface Element {
  id: string;
  type: 'text' | 'color' | 'gradient' | 'texture';
  content?: string;
  color?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientOpacity?: number;
  texture?: Texture;
}

interface TemplateExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  overwatchCode: string;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

const TemplateExportModal: React.FC<TemplateExportModalProps> = ({
  isOpen,
  onClose,
  templateName,
  overwatchCode,
  onExportComplete,
  onExportError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [backgroundColor, setBackgroundColor] = useState('#111827');
  const [removeTextureBackground, setRemoveTextureBackground] = useState(false);
  
  // 交互式编辑状态
  const [templatePosition, setTemplatePosition] = useState({ x: 50, y: 50 });
  const [templateScale, setTemplateScale] = useState(1);
  const [templateSize, setTemplateSize] = useState({ width: 300, height: 60 });
  const [customImages, setCustomImages] = useState<Array<{
    id: string;
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    originalRatio: number;
  }>>([]);
  const [heroes, setHeroes] = useState<Array<{
    id: string;
    name: string;
    englishName: string;
    avatar: string;
    role: string;
  }>>([]);
  const [heroResources, setHeroResources] = useState<Array<{
    id: string;
    heroId: string;
    name: string;
    description: string;
    resourceType: string;
    filePath: string;
    hero?: {
      id: string;
      name: string;
      englishName: string;
      role: string;
    };
  }>>([]);
  const [selectedHero, setSelectedHero] = useState<string>('all');
  const [loadingResources, setLoadingResources] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number | string, y: number | string }>({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [shiftPressed, setShiftPressed] = useState(false);

  // 检测是否为移动设备
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (window.innerWidth <= 768);
  };

  // 获取控制点大小（移动端更大）
  const getHandleSize = () => {
    return isMobile() ? 24 : 8;
  };

  useEffect(() => {
    if (isOpen && overwatchCode) {
      loadElements();
      loadHeroes();
      loadHeroResources();
    }
  }, [isOpen, overwatchCode]);

  // 当选择的英雄改变时，重新加载资源
  useEffect(() => {
    if (isOpen) {
      loadHeroResources(selectedHero);
    }
  }, [selectedHero, isOpen]);

  // 当职责筛选改变时，重置英雄选择
  useEffect(() => {
    if (selectedRole !== 'all') {
      // 检查当前选择的英雄是否还在筛选结果中
      const filteredHeroes = heroes.filter(hero => hero.role === selectedRole);
      if (selectedHero !== 'all' && !filteredHeroes.find(hero => hero.id === selectedHero)) {
        setSelectedHero('all');
      }
    }
  }, [selectedRole, heroes, selectedHero]);

  // 实时预览效果
  useEffect(() => {
    if (elements.length > 0 && previewCanvasRef.current) {
      renderPreview();
    }
  }, [elements, fontSize, backgroundColor, templatePosition, templateScale, customImages, selectedElement, removeTextureBackground]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedImage();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElement]);

  // 加载英雄列表
  const loadHeroes = async () => {
    try {
      const response = await fetch('/api/heroes');
      if (response.ok) {
        const data = await response.json();
        setHeroes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load heroes:', error);
      setHeroes([]);
    }
  };

  // 加载英雄资源
  const loadHeroResources = async (heroId?: string) => {
    setLoadingResources(true);
    try {
      const url = heroId && heroId !== 'all' ? `/api/hero-resources?heroId=${heroId}` : '/api/hero-resources';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const resources = Array.isArray(data) ? data : [];
        setHeroResources(resources.filter((resource: any) => resource.resourceType === 'image'));
      }
    } catch (error) {
      console.error('Failed to load hero resources:', error);
      setHeroResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  // 处理英雄资源选择
  const handleResourceSelect = (resource: any) => {
    const img = new Image();
    img.onload = () => {
      // 计算合适的初始大小，保持原始比例
      const maxSize = 120; // 最大初始尺寸
      let width = img.width;
      let height = img.height;
      
      // 如果图片太大，按比例缩放
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = width * ratio;
        height = height * ratio;
      }
      
      const newImage = {
        id: Date.now().toString(),
        src: resource.filePath,
        x: 50,
        y: 50,
        width: Math.round(width),
        height: Math.round(height),
        originalRatio: img.width / img.height // 保存原始比例
      };
      setCustomImages(prev => [...prev, newImage]);
    };
     img.src = resource.filePath;
   };

  // 处理鼠标事件
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否点击了当前选中图片的调整大小控制点
    if (selectedElement && selectedElement !== 'template') {
      const selectedImg = customImages.find(img => img.id === selectedElement);
      if (selectedImg) {
        const handleSize = getHandleSize();
        const halfHandle = handleSize / 2;
        
        // 定义所有控制点
        const handles = [
          { x: selectedImg.x - halfHandle, y: selectedImg.y - halfHandle, type: 'nw-resize' }, // 左上
          { x: selectedImg.x + selectedImg.width / 2 - halfHandle, y: selectedImg.y - halfHandle, type: 'n-resize' }, // 上
          { x: selectedImg.x + selectedImg.width - halfHandle, y: selectedImg.y - halfHandle, type: 'ne-resize' }, // 右上
          { x: selectedImg.x + selectedImg.width - halfHandle, y: selectedImg.y + selectedImg.height / 2 - halfHandle, type: 'e-resize' }, // 右
          { x: selectedImg.x + selectedImg.width - halfHandle, y: selectedImg.y + selectedImg.height - halfHandle, type: 'se-resize' }, // 右下
          { x: selectedImg.x + selectedImg.width / 2 - halfHandle, y: selectedImg.y + selectedImg.height - halfHandle, type: 's-resize' }, // 下
          { x: selectedImg.x - halfHandle, y: selectedImg.y + selectedImg.height - halfHandle, type: 'sw-resize' }, // 左下
          { x: selectedImg.x - halfHandle, y: selectedImg.y + selectedImg.height / 2 - halfHandle, type: 'w-resize' } // 左
        ];
        
        for (const handle of handles) {
          if (x >= handle.x && x <= handle.x + handleSize && y >= handle.y && y <= handle.y + handleSize) {
            setIsDragging(true);
            setIsResizing(true);
            setDragOffset({ x: handle.type, y: 0 }); // 存储调整类型
            return;
          }
        }
      }
    }

    // 检查是否点击了自定义图片
    for (let i = customImages.length - 1; i >= 0; i--) {
      const img = customImages[i];
      if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
        setSelectedElement(img.id);
        setIsDragging(true);
        setDragOffset({ x: x - img.x, y: y - img.y });
        return;
      }
    }

    // 检查是否点击了模板的控制点
    const templateControlType = checkTemplateControlPoint(x, y);
    if (templateControlType) {
      setSelectedElement('template');
      setIsDragging(true);
      setIsResizing(true);
      setDragOffset({ x: templateControlType, y: 0 }); // 存储调整类型
      return;
    }

    // 检查是否点击了模板内容
    const templateBounds = getTemplateBounds();
    if (templateBounds && 
        x >= templateBounds.x && x <= templateBounds.x + templateBounds.width &&
        y >= templateBounds.y && y <= templateBounds.y + templateBounds.height) {
      setSelectedElement('template');
      setIsDragging(true);
      setDragOffset({ x: x - templatePosition.x, y: y - templatePosition.y });
      return;
    }

    setSelectedElement(null);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (selectedElement === 'template') {
      if (isResizing) {
        // 调整模板大小
         const resizeType = dragOffset.x as string;
         const bounds = getTemplateBounds();
         if (bounds) {
           let newWidth = templateSize.width;
           let newHeight = templateSize.height;
           let newX = templatePosition.x;
           let newY = templatePosition.y;
           
           // 根据调整类型计算新的尺寸和位置
           switch (resizeType) {
             case 'se-resize': // 右下角
               newWidth = Math.max(100, (x - bounds.x) / templateScale);
               newHeight = Math.max(30, (y - bounds.y) / templateScale);
               break;
             case 'nw-resize': // 左上角
               const nwNewWidth = Math.max(100, (bounds.x + bounds.width - x) / templateScale);
               const nwNewHeight = Math.max(30, (bounds.y + bounds.height - y) / templateScale);
               newX = bounds.x + bounds.width - nwNewWidth * templateScale;
               newY = bounds.y + bounds.height - nwNewHeight * templateScale;
               newWidth = nwNewWidth;
               newHeight = nwNewHeight;
               break;
             case 'ne-resize': // 右上角
               newWidth = Math.max(100, (x - bounds.x) / templateScale);
               const neNewHeight = Math.max(30, (bounds.y + bounds.height - y) / templateScale);
               newY = bounds.y + bounds.height - neNewHeight * templateScale;
               newHeight = neNewHeight;
               break;
             case 'sw-resize': // 左下角
               const swNewWidth = Math.max(100, (bounds.x + bounds.width - x) / templateScale);
               newHeight = Math.max(30, (y - bounds.y) / templateScale);
               newX = bounds.x + bounds.width - swNewWidth * templateScale;
               newWidth = swNewWidth;
               break;
             case 'e-resize': // 右边
               newWidth = Math.max(100, (x - bounds.x) / templateScale);
               break;
             case 'w-resize': // 左边
               const wNewWidth = Math.max(100, (bounds.x + bounds.width - x) / templateScale);
               newX = bounds.x + bounds.width - wNewWidth * templateScale;
               newWidth = wNewWidth;
               break;
             case 'n-resize': // 上边
               const nNewHeight = Math.max(30, (bounds.y + bounds.height - y) / templateScale);
               newY = bounds.y + bounds.height - nNewHeight * templateScale;
               newHeight = nNewHeight;
               break;
             case 's-resize': // 下边
               newHeight = Math.max(30, (y - bounds.y) / templateScale);
               break;
           }
           
           setTemplateSize({ width: newWidth, height: newHeight });
           setTemplatePosition({ x: newX, y: newY });
         }
      } else if (typeof dragOffset.x === 'number' && typeof dragOffset.y === 'number') {
          setTemplatePosition({
            x: x - dragOffset.x,
            y: y - dragOffset.y
          });
        }
    } else if (isResizing) {
      // 调整图片大小
      const resizeType = dragOffset.x as string;
      setCustomImages(prev => prev.map(img => {
        if (img.id === selectedElement) {
          let newX = img.x;
          let newY = img.y;
          let newWidth = img.width;
          let newHeight = img.height;
          
          // 根据调整类型计算新的尺寸和位置
          switch (resizeType) {
            case 'se-resize': // 右下角
              newWidth = Math.max(20, x - img.x);
              newHeight = Math.max(20, y - img.y);
              break;
            case 'nw-resize': // 左上角
              newWidth = Math.max(20, img.x + img.width - x);
              newHeight = Math.max(20, img.y + img.height - y);
              newX = img.x + img.width - newWidth;
              newY = img.y + img.height - newHeight;
              break;
            case 'ne-resize': // 右上角
              newWidth = Math.max(20, x - img.x);
              newHeight = Math.max(20, img.y + img.height - y);
              newY = img.y + img.height - newHeight;
              break;
            case 'sw-resize': // 左下角
              newWidth = Math.max(20, img.x + img.width - x);
              newHeight = Math.max(20, y - img.y);
              newX = img.x + img.width - newWidth;
              break;
            case 'e-resize': // 右边
              newWidth = Math.max(20, x - img.x);
              break;
            case 'w-resize': // 左边
              newWidth = Math.max(20, img.x + img.width - x);
              newX = img.x + img.width - newWidth;
              break;
            case 'n-resize': // 上边
              newHeight = Math.max(20, img.y + img.height - y);
              newY = img.y + img.height - newHeight;
              break;
            case 's-resize': // 下边
              newHeight = Math.max(20, y - img.y);
              break;
          }
          
          // 如果按住Shift键，保持原始比例
          if (shiftPressed && img.originalRatio) {
            const widthBasedHeight = newWidth / img.originalRatio;
            const heightBasedWidth = newHeight * img.originalRatio;
            
            if (resizeType.includes('e') || resizeType.includes('w')) {
              // 水平调整时，根据宽度计算高度
              newHeight = widthBasedHeight;
              if (resizeType.includes('n')) {
                newY = img.y + img.height - newHeight;
              }
            } else if (resizeType.includes('n') || resizeType.includes('s')) {
              // 垂直调整时，根据高度计算宽度
              newWidth = heightBasedWidth;
              if (resizeType.includes('w')) {
                newX = img.x + img.width - newWidth;
              }
            } else {
              // 角落调整时，选择较小的尺寸
              if (widthBasedHeight <= newHeight) {
                newHeight = widthBasedHeight;
              } else {
                newWidth = heightBasedWidth;
              }
              
              // 重新计算位置
              if (resizeType.includes('n')) {
                newY = img.y + img.height - newHeight;
              }
              if (resizeType.includes('w')) {
                newX = img.x + img.width - newWidth;
              }
            }
          }
          
          return { 
            ...img, 
            x: Math.round(newX), 
            y: Math.round(newY),
            width: Math.round(newWidth), 
            height: Math.round(newHeight) 
          };
        }
        return img;
      }));
    } else {
      // 拖拽图片位置
      if (typeof dragOffset.x === 'number' && typeof dragOffset.y === 'number') {
        const offsetX = dragOffset.x as number;
        const offsetY = dragOffset.y as number;
        setCustomImages(prev => prev.map(img => 
          img.id === selectedElement
            ? { ...img, x: x - offsetX, y: y - offsetY }
            : img
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // 获取准确的触摸坐标
  const getTouchCoordinates = (touch: React.Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  };

  // 触摸事件处理函数
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    const canvas = previewCanvasRef.current;
    if (!canvas || !touch) return;

    const coords = getTouchCoordinates(touch, canvas);
    const x = coords.x;
    const y = coords.y;

    // 检查是否点击了当前选中图片的调整大小控制点
    if (selectedElement && selectedElement !== 'template') {
      const selectedImg = customImages.find(img => img.id === selectedElement);
      if (selectedImg) {
        const handleSize = getHandleSize();
        const halfHandle = handleSize / 2;
        
        // 定义所有控制点
        const handles = [
          { x: selectedImg.x - halfHandle, y: selectedImg.y - halfHandle, type: 'nw-resize' },
          { x: selectedImg.x + selectedImg.width / 2 - halfHandle, y: selectedImg.y - halfHandle, type: 'n-resize' },
          { x: selectedImg.x + selectedImg.width - halfHandle, y: selectedImg.y - halfHandle, type: 'ne-resize' },
          { x: selectedImg.x + selectedImg.width - halfHandle, y: selectedImg.y + selectedImg.height / 2 - halfHandle, type: 'e-resize' },
          { x: selectedImg.x + selectedImg.width - halfHandle, y: selectedImg.y + selectedImg.height - halfHandle, type: 'se-resize' },
          { x: selectedImg.x + selectedImg.width / 2 - halfHandle, y: selectedImg.y + selectedImg.height - halfHandle, type: 's-resize' },
          { x: selectedImg.x - halfHandle, y: selectedImg.y + selectedImg.height - halfHandle, type: 'sw-resize' },
          { x: selectedImg.x - halfHandle, y: selectedImg.y + selectedImg.height / 2 - halfHandle, type: 'w-resize' }
        ];
        
        for (const handle of handles) {
          if (x >= handle.x && x <= handle.x + handleSize && y >= handle.y && y <= handle.y + handleSize) {
            setIsDragging(true);
            setIsResizing(true);
            setDragOffset({ x: handle.type, y: 0 });
            return;
          }
        }
      }
    }

    // 检查是否点击了自定义图片
    for (let i = customImages.length - 1; i >= 0; i--) {
      const img = customImages[i];
      if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
        setSelectedElement(img.id);
        setIsDragging(true);
        setDragOffset({ x: x - img.x, y: y - img.y });
        return;
      }
    }

    // 检查是否点击了模板的控制点
    const templateControlType = checkTemplateControlPoint(x, y);
    if (templateControlType) {
      setSelectedElement('template');
      setIsDragging(true);
      setIsResizing(true);
      setDragOffset({ x: templateControlType, y: 0 });
      return;
    }

    // 检查是否点击了模板内容
    const templateBounds = getTemplateBounds();
    if (templateBounds && 
        x >= templateBounds.x && x <= templateBounds.x + templateBounds.width &&
        y >= templateBounds.y && y <= templateBounds.y + templateBounds.height) {
      setSelectedElement('template');
      setIsDragging(true);
      setDragOffset({ x: x - templatePosition.x, y: y - templatePosition.y });
      return;
    }

    setSelectedElement(null);
  };

  // 节流函数用于优化性能
  const throttleRef = useRef<number | null>(null);
  
  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isDragging || !selectedElement) return;

    // 使用节流减少更新频率
    if (throttleRef.current) {
      cancelAnimationFrame(throttleRef.current);
    }
    
    throttleRef.current = requestAnimationFrame(() => {
      const touch = event.touches[0];
      const canvas = previewCanvasRef.current;
      if (!canvas || !touch) return;

      const coords = getTouchCoordinates(touch, canvas);
      const x = coords.x;
      const y = coords.y;

      if (selectedElement === 'template') {
        if (isResizing) {
          // 调整模板大小的逻辑与鼠标事件相同
          const resizeType = dragOffset.x as string;
          const bounds = getTemplateBounds();
          if (bounds) {
            let newWidth = templateSize.width;
            let newHeight = templateSize.height;
            let newX = templatePosition.x;
            let newY = templatePosition.y;
            
            switch (resizeType) {
              case 'se-resize':
                newWidth = Math.max(100, (x - bounds.x) / templateScale);
                newHeight = Math.max(30, (y - bounds.y) / templateScale);
                break;
              case 'nw-resize':
                const nwNewWidth = Math.max(100, (bounds.x + bounds.width - x) / templateScale);
                const nwNewHeight = Math.max(30, (bounds.y + bounds.height - y) / templateScale);
                newX = bounds.x + bounds.width - nwNewWidth * templateScale;
                newY = bounds.y + bounds.height - nwNewHeight * templateScale;
                newWidth = nwNewWidth;
                newHeight = nwNewHeight;
                break;
              case 'ne-resize':
                newWidth = Math.max(100, (x - bounds.x) / templateScale);
                const neNewHeight = Math.max(30, (bounds.y + bounds.height - y) / templateScale);
                newY = bounds.y + bounds.height - neNewHeight * templateScale;
                newHeight = neNewHeight;
                break;
              case 'sw-resize':
                const swNewWidth = Math.max(100, (bounds.x + bounds.width - x) / templateScale);
                newX = bounds.x + bounds.width - swNewWidth * templateScale;
                newWidth = swNewWidth;
                newHeight = Math.max(30, (y - bounds.y) / templateScale);
                break;
              case 'n-resize':
                const nNewHeight = Math.max(30, (bounds.y + bounds.height - y) / templateScale);
                newY = bounds.y + bounds.height - nNewHeight * templateScale;
                newHeight = nNewHeight;
                break;
              case 's-resize':
                newHeight = Math.max(30, (y - bounds.y) / templateScale);
                break;
              case 'e-resize':
                newWidth = Math.max(100, (x - bounds.x) / templateScale);
                break;
              case 'w-resize':
                const wNewWidth = Math.max(100, (bounds.x + bounds.width - x) / templateScale);
                newX = bounds.x + bounds.width - wNewWidth * templateScale;
                newWidth = wNewWidth;
                break;
            }
            
            setTemplateSize({ width: newWidth, height: newHeight });
            setTemplatePosition({ x: newX, y: newY });
          }
        } else {
          // 拖拽模板位置
          const offsetX = typeof dragOffset.x === 'number' ? dragOffset.x : 0;
          const offsetY = typeof dragOffset.y === 'number' ? dragOffset.y : 0;
          setTemplatePosition({
            x: x - offsetX,
            y: y - offsetY
          });
        }
      } else {
        // 处理自定义图片
        const selectedImg = customImages.find(img => img.id === selectedElement);
        if (selectedImg) {
          if (isResizing) {
            // 调整图片大小
            const resizeType = dragOffset.x as string;
            let newWidth = selectedImg.width;
            let newHeight = selectedImg.height;
            let newX = selectedImg.x;
            let newY = selectedImg.y;
            
            switch (resizeType) {
              case 'se-resize':
                newWidth = Math.max(20, x - selectedImg.x);
                newHeight = shiftPressed 
                  ? newWidth / selectedImg.originalRatio 
                  : Math.max(20, y - selectedImg.y);
                break;
              case 'nw-resize':
                newWidth = Math.max(20, selectedImg.x + selectedImg.width - x);
                newHeight = shiftPressed 
                  ? newWidth / selectedImg.originalRatio 
                  : Math.max(20, selectedImg.y + selectedImg.height - y);
                newX = selectedImg.x + selectedImg.width - newWidth;
                newY = selectedImg.y + selectedImg.height - newHeight;
                break;
              case 'ne-resize':
                newWidth = Math.max(20, x - selectedImg.x);
                newHeight = shiftPressed 
                  ? newWidth / selectedImg.originalRatio 
                  : Math.max(20, selectedImg.y + selectedImg.height - y);
                newY = selectedImg.y + selectedImg.height - newHeight;
                break;
              case 'sw-resize':
                newWidth = Math.max(20, selectedImg.x + selectedImg.width - x);
                newHeight = shiftPressed 
                  ? newWidth / selectedImg.originalRatio 
                  : Math.max(20, y - selectedImg.y);
                newX = selectedImg.x + selectedImg.width - newWidth;
                break;
              case 'n-resize':
                newHeight = Math.max(20, selectedImg.y + selectedImg.height - y);
                newY = selectedImg.y + selectedImg.height - newHeight;
                if (shiftPressed) {
                  newWidth = newHeight * selectedImg.originalRatio;
                  newX = selectedImg.x + (selectedImg.width - newWidth) / 2;
                }
                break;
              case 's-resize':
                newHeight = Math.max(20, y - selectedImg.y);
                if (shiftPressed) {
                  newWidth = newHeight * selectedImg.originalRatio;
                  newX = selectedImg.x + (selectedImg.width - newWidth) / 2;
                }
                break;
              case 'e-resize':
                newWidth = Math.max(20, x - selectedImg.x);
                if (shiftPressed) {
                  newHeight = newWidth / selectedImg.originalRatio;
                  newY = selectedImg.y + (selectedImg.height - newHeight) / 2;
                }
                break;
              case 'w-resize':
                newWidth = Math.max(20, selectedImg.x + selectedImg.width - x);
                newX = selectedImg.x + selectedImg.width - newWidth;
                if (shiftPressed) {
                  newHeight = newWidth / selectedImg.originalRatio;
                  newY = selectedImg.y + (selectedImg.height - newHeight) / 2;
                }
                break;
            }
            
            setCustomImages(prev => prev.map(img => 
              img.id === selectedElement 
                ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight }
                : img
            ));
          } else {
            // 拖拽图片位置
            const offsetX = typeof dragOffset.x === 'number' ? dragOffset.x : 0;
            const offsetY = typeof dragOffset.y === 'number' ? dragOffset.y : 0;
            setCustomImages(prev => prev.map(img => 
              img.id === selectedElement 
                ? { ...img, x: x - offsetX, y: y - offsetY }
                : img
            ));
          }
        }
      }
    });
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    setIsDragging(false);
    setIsResizing(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // 获取模板边界
  const getTemplateBounds = () => {
    if (elements.length === 0) return null;
    
    // 简化计算，返回模板大概的边界
    return {
      x: templatePosition.x,
      y: templatePosition.y,
      width: templateSize.width * templateScale,
      height: templateSize.height * templateScale
    };
  };

  // 检查是否点击了模板的控制点
  const checkTemplateControlPoint = (x: number, y: number) => {
    const bounds = getTemplateBounds();
    if (!bounds) return null;
    
    const handleSize = getHandleSize();
    const halfHandle = handleSize / 2;
    
    // 定义所有控制点
    const handles = [
      { x: bounds.x - halfHandle, y: bounds.y - halfHandle, type: 'nw-resize' }, // 左上
      { x: bounds.x + bounds.width / 2 - halfHandle, y: bounds.y - halfHandle, type: 'n-resize' }, // 上
      { x: bounds.x + bounds.width - halfHandle, y: bounds.y - halfHandle, type: 'ne-resize' }, // 右上
      { x: bounds.x + bounds.width - halfHandle, y: bounds.y + bounds.height / 2 - halfHandle, type: 'e-resize' }, // 右
      { x: bounds.x + bounds.width - halfHandle, y: bounds.y + bounds.height - halfHandle, type: 'se-resize' }, // 右下
      { x: bounds.x + bounds.width / 2 - halfHandle, y: bounds.y + bounds.height - halfHandle, type: 's-resize' }, // 下
      { x: bounds.x - halfHandle, y: bounds.y + bounds.height - halfHandle, type: 'sw-resize' }, // 左下
      { x: bounds.x - halfHandle, y: bounds.y + bounds.height / 2 - halfHandle, type: 'w-resize' } // 左
    ];
    
    for (const handle of handles) {
      if (x >= handle.x && x <= handle.x + handleSize && y >= handle.y && y <= handle.y + handleSize) {
        return handle.type;
      }
    }
    
    return null;
  };

  // 删除选中的自定义图片
  const deleteSelectedImage = () => {
    if (selectedElement && selectedElement !== 'template') {
      setCustomImages(prev => prev.filter(img => img.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  // 辅助函数：加载图片
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const loadElements = async () => {
    setLoading(true);
    try {
      const textures = await loadTexturesWithCache();
      const parsedElements = await parseOverwatchCode(overwatchCode, textures);
      setElements(parsedElements);
    } catch (error) {
      console.error('Failed to parse template:', error);
      onExportError?.('解析模板失败');
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = async () => {
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置预览画布尺寸（更大的预览尺寸）
    const previewWidth = 600;
    const previewHeight = 400;
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    // 设置背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, previewWidth, previewHeight);

    // 绘制自定义图片
    for (const customImg of customImages) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, customImg.x, customImg.y, customImg.width, customImg.height);
            
            // 如果是选中的图片，绘制选中边框和控制点
            if (selectedElement === customImg.id) {
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2;
              ctx.strokeRect(customImg.x, customImg.y, customImg.width, customImg.height);
              
              // 绘制8个调整大小的控制点
              const handleSize = getHandleSize();
              const halfHandle = handleSize / 2;
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 1;
              
              // 四个角的控制点
              const corners = [
                { x: customImg.x - halfHandle, y: customImg.y - halfHandle }, // 左上
                { x: customImg.x + customImg.width - halfHandle, y: customImg.y - halfHandle }, // 右上
                { x: customImg.x - halfHandle, y: customImg.y + customImg.height - halfHandle }, // 左下
                { x: customImg.x + customImg.width - halfHandle, y: customImg.y + customImg.height - halfHandle } // 右下
              ];
              
              // 四个边的中点控制点
              const edges = [
                { x: customImg.x + customImg.width / 2 - halfHandle, y: customImg.y - halfHandle }, // 上
                { x: customImg.x + customImg.width - halfHandle, y: customImg.y + customImg.height / 2 - halfHandle }, // 右
                { x: customImg.x + customImg.width / 2 - halfHandle, y: customImg.y + customImg.height - halfHandle }, // 下
                { x: customImg.x - halfHandle, y: customImg.y + customImg.height / 2 - halfHandle } // 左
              ];
              
              // 绘制所有控制点
              [...corners, ...edges].forEach(point => {
                ctx.fillRect(point.x, point.y, handleSize, handleSize);
                ctx.strokeRect(point.x, point.y, handleSize, handleSize);
              });
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = customImg.src;
        });
      } catch (error) {
        console.error('Error loading custom image:', error);
      }
    }

    if (elements.length === 0) return;

    // 设置字体（适合预览尺寸）
    const scaledFontSize = Math.round(fontSize * templateScale);
    ctx.font = `${scaledFontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 计算布局参数（缩放到预览尺寸）
    const elementSpacing = 2 * templateScale;
    const lineHeight = scaledFontSize * 1.8;
    const maxWidth = templateSize.width * templateScale; // 使用模板宽度作为最大宽度
    
    // 将元素分组到行中，文本按字符换行，纹理按整个元素换行
        const lines: Array<{elements: typeof elements, width: number}> = [];
        let currentLine: typeof elements = [];
        let currentLineWidth = 0;
        
        for (const element of elements) {
          if (element.type === 'text' || element.type === 'color' || element.type === 'gradient') {
            const text = element.content || '';
            const chars = text.split('');
            
            // 对文本元素按字符处理
            for (const char of chars) {
              const charMetrics = ctx.measureText(char);
              const charWidth = charMetrics.width;
              const needSpacing = currentLine.length > 0 ? elementSpacing : 0;
              
              if (currentLine.length > 0 && currentLineWidth + needSpacing + charWidth > maxWidth) {
                // 当前行已满，开始新行
                lines.push({ elements: [...currentLine], width: currentLineWidth });
                currentLine = [{ ...element, content: char }];
                currentLineWidth = charWidth;
              } else {
                // 添加到当前行
                currentLine.push({ ...element, content: char });
                currentLineWidth += needSpacing + charWidth;
              }
            }
          } else if (element.type === 'texture' && element.texture) {
            // 纹理元素按整个元素换行
            const textureSize = Math.round(scaledFontSize * 1.5);
            const needSpacing = currentLine.length > 0 ? elementSpacing : 0;
            
            if (currentLine.length > 0 && currentLineWidth + needSpacing + textureSize > maxWidth) {
              lines.push({ elements: [...currentLine], width: currentLineWidth });
              currentLine = [element];
              currentLineWidth = textureSize;
            } else {
              currentLine.push(element);
              currentLineWidth += needSpacing + textureSize;
            }
          }
        }
        
        if (currentLine.length > 0) {
          lines.push({ elements: [...currentLine], width: currentLineWidth });
        }
    
    // 计算总高度并调整起始Y位置
    const totalHeight = lines.length * lineHeight;
    const startY = templatePosition.y;
    
    // 绘制每一行
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineY = startY + lineIndex * lineHeight;
      
      // 计算行的起始X位置
      let currentX = templatePosition.x;
      
      // 绘制行中的每个元素
      for (const element of line.elements) {
        if (element.type === 'text') {
          const text = element.content || '';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, currentX, lineY);
          const textMetrics = ctx.measureText(text);
          currentX += textMetrics.width + elementSpacing;
          
        } else if (element.type === 'color') {
          const text = element.content || '';
          ctx.fillStyle = element.color || '#ffffff';
          ctx.fillText(text, currentX, lineY);
          const textMetrics = ctx.measureText(text);
          currentX += textMetrics.width + elementSpacing;
          
        } else if (element.type === 'gradient') {
          const text = element.content || '';
          const textMetrics = ctx.measureText(text);
          const textGradient = ctx.createLinearGradient(currentX, lineY - scaledFontSize/2, currentX + textMetrics.width, lineY + scaledFontSize/2);
          textGradient.addColorStop(0, element.gradientStartColor || '#ffffff');
          textGradient.addColorStop(1, element.gradientEndColor || '#ffffff');
          ctx.fillStyle = textGradient;
          ctx.fillText(text, currentX, lineY);
          currentX += textMetrics.width + elementSpacing;
          
        } else if (element.type === 'texture' && element.texture) {
          const textureSize = Math.round(scaledFontSize * 1.5);
          
          try {
            // 根据设置决定是否绘制背景
            if (!removeTextureBackground) {
              ctx.fillStyle = 'rgba(31, 41, 55, 0.6)';
              ctx.fillRect(currentX, lineY - textureSize/2, textureSize, textureSize);
              ctx.strokeStyle = 'rgba(75, 85, 99, 0.8)';
              ctx.lineWidth = 1;
              ctx.strokeRect(currentX, lineY - textureSize/2, textureSize, textureSize);
            }
            
            const img = await loadImage(element.texture.imagePath);
            const padding = removeTextureBackground ? 0 : 1;
            const size = removeTextureBackground ? textureSize : textureSize - 2;
            ctx.drawImage(img, currentX + padding, lineY - textureSize/2 + padding, size, size);
          } catch (error) {
            // 错误情况下仍然显示背景和问号
            ctx.fillStyle = 'rgba(31, 41, 55, 0.6)';
            ctx.fillRect(currentX, lineY - textureSize/2, textureSize, textureSize);
            ctx.strokeStyle = 'rgba(75, 85, 99, 0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(currentX, lineY - textureSize/2, textureSize, textureSize);
            ctx.fillStyle = '#9ca3af';
            const oldAlign: CanvasTextAlign = ctx.textAlign;
            ctx.textAlign = 'center';
            ctx.fillText('?', currentX + textureSize/2, lineY);
            ctx.textAlign = oldAlign;
          }
          
          currentX += textureSize + elementSpacing;
        }
      }
    }
    
    // 如果模板被选中，绘制选中边框和控制点
    if (selectedElement === 'template') {
      const bounds = getTemplateBounds();
      if (bounds) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // 绘制八个控制点
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        const controlSize = getHandleSize();
        const halfControl = controlSize / 2;
        
        // 四个角
        ctx.fillRect(bounds.x - halfControl, bounds.y - halfControl, controlSize, controlSize); // 左上角
        ctx.strokeRect(bounds.x - halfControl, bounds.y - halfControl, controlSize, controlSize);
        ctx.fillRect(bounds.x + bounds.width - halfControl, bounds.y - halfControl, controlSize, controlSize); // 右上角
        ctx.strokeRect(bounds.x + bounds.width - halfControl, bounds.y - halfControl, controlSize, controlSize);
        ctx.fillRect(bounds.x - halfControl, bounds.y + bounds.height - halfControl, controlSize, controlSize); // 左下角
        ctx.strokeRect(bounds.x - halfControl, bounds.y + bounds.height - halfControl, controlSize, controlSize);
        ctx.fillRect(bounds.x + bounds.width - halfControl, bounds.y + bounds.height - halfControl, controlSize, controlSize); // 右下角
        ctx.strokeRect(bounds.x + bounds.width - halfControl, bounds.y + bounds.height - halfControl, controlSize, controlSize);
        
        // 四条边的中点
        ctx.fillRect(bounds.x + bounds.width/2 - halfControl, bounds.y - halfControl, controlSize, controlSize); // 上边中点
        ctx.strokeRect(bounds.x + bounds.width/2 - halfControl, bounds.y - halfControl, controlSize, controlSize);
        ctx.fillRect(bounds.x + bounds.width - halfControl, bounds.y + bounds.height/2 - halfControl, controlSize, controlSize); // 右边中点
        ctx.strokeRect(bounds.x + bounds.width - halfControl, bounds.y + bounds.height/2 - halfControl, controlSize, controlSize);
        ctx.fillRect(bounds.x + bounds.width/2 - halfControl, bounds.y + bounds.height - halfControl, controlSize, controlSize); // 下边中点
        ctx.strokeRect(bounds.x + bounds.width/2 - halfControl, bounds.y + bounds.height - halfControl, controlSize, controlSize);
        ctx.fillRect(bounds.x - halfControl, bounds.y + bounds.height/2 - halfControl, controlSize, controlSize); // 左边中点
        ctx.strokeRect(bounds.x - halfControl, bounds.y + bounds.height/2 - halfControl, controlSize, controlSize);
      }
    }
  };

  const exportToImage = async () => {
    if (!previewCanvasRef.current || elements.length === 0) return;

    setExporting(true);
    try {
      // 创建一个新的canvas用于导出，尺寸与预览完全一致
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('无法获取canvas上下文');

      // 使用与预览相同的尺寸
      const exportWidth = 600;
      const exportHeight = 400;
      
      // 设置canvas尺寸
      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;

      // 设置背景
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, exportWidth, exportHeight);
      
      // 绘制自定义图片（与预览完全一致）
      for (const customImg of customImages) {
        try {
          const img = await loadImage(customImg.src);
          ctx.drawImage(
            img, 
            customImg.x, 
            customImg.y, 
            customImg.width, 
            customImg.height
          );
        } catch (error) {
          console.error('Error loading custom image:', error);
        }
      }

      // 设置字体（与预览完全一致）
      const scaledFontSize = Math.round(fontSize * templateScale);
      ctx.font = `${scaledFontSize}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // 计算布局参数（与预览完全一致）
      const elementSpacing = 2 * templateScale;
      const lineHeight = scaledFontSize * 1.8;
      const maxWidth = templateSize.width * templateScale;
      
      // 将元素分组到行中，文本按字符换行，纹理按整个元素换行
      const lines: Array<{elements: typeof elements, width: number}> = [];
      let currentLine: typeof elements = [];
      let currentLineWidth = 0;
      
      for (const element of elements) {
        if (element.type === 'text' || element.type === 'color' || element.type === 'gradient') {
          const text = element.content || '';
          const chars = text.split('');
          
          // 对文本元素按字符处理
          for (const char of chars) {
            const charMetrics = ctx.measureText(char);
            const charWidth = charMetrics.width;
            const needSpacing = currentLine.length > 0 ? elementSpacing : 0;
            
            if (currentLine.length > 0 && currentLineWidth + needSpacing + charWidth > maxWidth) {
              // 当前行已满，开始新行
              lines.push({ elements: [...currentLine], width: currentLineWidth });
              currentLine = [{ ...element, content: char }];
              currentLineWidth = charWidth;
            } else {
              // 添加到当前行
              currentLine.push({ ...element, content: char });
              currentLineWidth += needSpacing + charWidth;
            }
          }
        } else if (element.type === 'texture' && element.texture) {
          // 纹理元素按整个元素换行
          const textureSize = Math.round(fontSize * templateScale * 1.5);
          const needSpacing = currentLine.length > 0 ? elementSpacing : 0;
          
          if (currentLine.length > 0 && currentLineWidth + needSpacing + textureSize > maxWidth) {
            // 保存当前行并开始新行
            lines.push({ elements: [...currentLine], width: currentLineWidth });
            currentLine = [element];
            currentLineWidth = textureSize;
          } else {
            // 添加到当前行
            currentLine.push(element);
            currentLineWidth += needSpacing + textureSize;
          }
        }
      }
      
      // 添加最后一行
      if (currentLine.length > 0) {
        lines.push({ elements: [...currentLine], width: currentLineWidth });
      }
      
      // 使用模板位置（与预览完全一致）
      const startY = templatePosition.y;
      
      // 绘制每一行
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineY = startY + lineIndex * lineHeight;
        
        // 使用模板位置的X坐标
        let currentX = templatePosition.x;
        
        // 绘制行中的每个元素
        for (const element of line.elements) {
          if (element.type === 'text') {
            const text = element.content || '';
            
            // 绘制文本（无背景，无边框）
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, currentX, lineY);
            
            const textMetrics = ctx.measureText(text);
            currentX += textMetrics.width + elementSpacing;
            
          } else if (element.type === 'color') {
            const text = element.content || '';
            
            // 绘制彩色文本（无背景，无边框）
            ctx.fillStyle = element.color || '#ffffff';
            ctx.fillText(text, currentX, lineY);
            
            const textMetrics = ctx.measureText(text);
            currentX += textMetrics.width + elementSpacing;
            
          } else if (element.type === 'gradient') {
            const text = element.content || '';
            const textMetrics = ctx.measureText(text);
            
            // 创建渐变
            const textGradient = ctx.createLinearGradient(currentX, lineY - scaledFontSize/2, currentX + textMetrics.width, lineY + scaledFontSize/2);
            textGradient.addColorStop(0, element.gradientStartColor || '#ffffff');
            textGradient.addColorStop(1, element.gradientEndColor || '#ffffff');
            
            // 绘制渐变文本（无背景，无边框）
            ctx.fillStyle = textGradient;
            ctx.fillText(text, currentX, lineY);
            
            currentX += textMetrics.width + elementSpacing;
            
          } else if (element.type === 'texture' && element.texture) {
            const textureSize = Math.round(scaledFontSize * 1.5);
            
            try {
              // 根据设置决定是否绘制背景
              if (!removeTextureBackground) {
                ctx.fillStyle = 'rgba(31, 41, 55, 0.6)';
                ctx.fillRect(currentX, lineY - textureSize/2, textureSize, textureSize);
                ctx.strokeStyle = 'rgba(75, 85, 99, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(currentX, lineY - textureSize/2, textureSize, textureSize);
              }
              
              // 加载并绘制纹理图片
              const img = await loadImage(element.texture.imagePath);
              const padding = removeTextureBackground ? 0 : 2;
              const size = removeTextureBackground ? textureSize : textureSize - 4;
              ctx.drawImage(img, currentX + padding, lineY - textureSize/2 + padding, size, size);
            } catch (error) {
              // 错误情况下仍然显示背景和问号
              ctx.fillStyle = 'rgba(31, 41, 55, 0.6)';
              ctx.fillRect(currentX, lineY - textureSize/2, textureSize, textureSize);
              ctx.strokeStyle = 'rgba(75, 85, 99, 0.8)';
              ctx.lineWidth = 2;
              ctx.strokeRect(currentX, lineY - textureSize/2, textureSize, textureSize);
              ctx.fillStyle = '#9ca3af';
              const oldAlign: CanvasTextAlign = ctx.textAlign;
               ctx.textAlign = 'center';
               ctx.fillText('?', currentX + textureSize/2, lineY);
               ctx.textAlign = oldAlign;
            }
            
            currentX += textureSize + elementSpacing;
          }
        }
      }

      // 导出图片
      exportCanvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${templateName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_表情包.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          onExportComplete?.();
        } else {
          onExportError?.('导出失败');
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('导出图片失败:', error);
      onExportError?.(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl border border-orange-500/20 shadow-2xl w-full h-full sm:max-w-7xl sm:w-full sm:max-h-[95vh] sm:h-auto overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-orange-500/20 bg-gradient-to-r from-orange-600/10 to-purple-600/10">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">表情包编辑器</h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate max-w-[200px] sm:max-w-none">{templateName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all duration-200 p-2 hover:bg-gray-700/50 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] sm:h-[calc(95vh-140px)]">
          {/* 控制面板 */}
          <div className="w-full lg:w-72 bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-orange-500/20 p-3 sm:p-6 overflow-y-auto max-h-[40vh] lg:max-h-none">
            <div className="space-y-4 sm:space-y-6">
              {/* 模板控制 */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-500/10">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  模板设置
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">字体大小</label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="range"
                        min="12"
                        max="48"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="text-xs sm:text-sm text-orange-400 font-mono w-10 sm:w-12">{fontSize}px</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">背景颜色</label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-10 h-6 sm:w-12 sm:h-8 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm text-gray-400 font-mono truncate">{backgroundColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeTextureBackground}
                        onChange={(e) => setRemoveTextureBackground(e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-xs sm:text-sm font-medium text-gray-300">去除纹理背景</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 图片管理 */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-500/10">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  图片管理
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <button
                    onClick={() => setShowResourceModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加英雄图片
                  </button>
                  
                  {customImages.length > 0 && (
                    <div className="text-xs text-gray-400 text-center">
                      已添加 {customImages.length} 张图片
                    </div>
                  )}
                  
                  {selectedElement && selectedElement !== 'template' && (
                    <button
                      onClick={deleteSelectedImage}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除选中图片
                    </button>
                  )}
                </div>
              </div>

              {/* 操作提示 */}
              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-500/20">
                <h3 className="text-xs sm:text-sm font-semibold text-blue-300 mb-2 sm:mb-3 flex items-center gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  操作提示
                </h3>
                <div className="text-xs text-gray-400 space-y-1 sm:space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">·</span>
                    <span>拖拽模板或图片来移动位置</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">·</span>
                    <span>拖拽控制点来调整大小</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧预览区域 */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 sm:p-6 border-b border-orange-500/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  实时预览
                </h3>
                <button
                  onClick={exportToImage}
                  disabled={loading || exporting || elements.length === 0}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg text-sm sm:text-base"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      导出中...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      导出表情包
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-3 sm:p-6 overflow-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                  <span className="text-gray-400 text-lg">加载模板中...</span>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {elements.length === 0 ? (
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-gray-400 text-lg">暂无模板内容</div>
                      <div className="text-gray-500 text-sm mt-2">请先选择一个模板</div>
                    </div>
                  ) : (
                    <div className="relative">
                      <canvas 
                        ref={previewCanvasRef}
                        className="border-2 border-orange-500/30 rounded-xl bg-gray-900/50 cursor-pointer shadow-2xl hover:border-orange-500/50 transition-all duration-200 max-w-full"
                        style={{ width: 'min(600px, 100%)', height: 'min(400px, 60vw)' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                      />
                      {selectedElement && (
                        <div className="absolute -top-8 left-0 bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                          {selectedElement === 'template' ? '模板已选中' : '图片已选中'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 隐藏的canvas用于导出 */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
      
      {/* 英雄资源选择模态框 */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  选择英雄图片
                </h2>
                <button
                  onClick={() => setShowResourceModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
               {/* 筛选控制区域 */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 {/* 英雄选择 */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">选择英雄</label>
                   <select
                     value={selectedHero}
                     onChange={(e) => setSelectedHero(e.target.value)}
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                   >
                     <option value="all">所有英雄</option>
                     {heroes
                       .filter(hero => selectedRole === 'all' || hero.role === selectedRole)
                       .map(hero => (
                         <option key={hero.id} value={hero.id}>{hero.name}</option>
                       ))}
                   </select>
                 </div>
                 
                 {/* 职责筛选 */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">职责筛选</label>
                   <select
                     value={selectedRole}
                     onChange={(e) => setSelectedRole(e.target.value)}
                     className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                   >
                     <option value="all">所有职责</option>
                     <option value="重装">重装</option>
                     <option value="输出">输出</option>
                     <option value="支援">支援</option>
                   </select>
                 </div>
                 
                 {/* 搜索框 */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">搜索图片</label>
                   <div className="relative">
                     <input
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="输入图片名称..."
                       className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                     />
                     <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                   </div>
                 </div>
               </div>
              
              {/* 英雄资源网格 */}
               <div className="max-h-96 overflow-y-auto">
                 {loadingResources ? (
                   <div className="flex items-center justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                     <span className="ml-3 text-gray-400">加载中...</span>
                   </div>
                 ) : (
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {heroResources
                       .filter(resource => {
                         // 职责筛选
                         if (selectedRole !== 'all' && resource.hero?.role !== selectedRole) {
                           return false;
                         }
                         // 搜索筛选
                         if (searchQuery.trim()) {
                           const query = searchQuery.toLowerCase().trim();
                           const matchesName = resource.name.toLowerCase().includes(query);
                           const matchesHeroName = resource.hero?.name.toLowerCase().includes(query);
                           const matchesHeroEnglishName = resource.hero?.englishName.toLowerCase().includes(query);
                           if (!matchesName && !matchesHeroName && !matchesHeroEnglishName) {
                             return false;
                           }
                         }
                         return true;
                       })
                       .map(resource => (
                         <button
                           key={resource.id}
                           onClick={() => {
                             handleResourceSelect(resource);
                             setShowResourceModal(false);
                           }}
                           className="group bg-gray-700 hover:bg-gray-600 rounded-lg p-3 transition-all duration-200 border border-gray-600 hover:border-purple-500"
                           title={resource.description}
                         >
                           <div className="aspect-square mb-2 overflow-hidden rounded">
                             <img
                               src={resource.filePath}
                               alt={resource.name}
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                             />
                           </div>
                           <div className="text-xs text-gray-300 text-center truncate">{resource.name}</div>
                           {resource.hero && (
                             <div className="text-xs text-gray-500 text-center mt-1">{resource.hero.name}</div>
                           )}
                         </button>
                       ))}
                   </div>
                 )}
                 {!loadingResources && heroResources.filter(resource => {
                   if (selectedRole !== 'all' && resource.hero?.role !== selectedRole) return false;
                   if (searchQuery.trim() && !resource.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
                   return true;
                 }).length === 0 && (
                   <div className="text-center py-12">
                     <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     <div className="text-gray-400 text-lg mb-2">未找到匹配的图片资源</div>
                     <div className="text-gray-500 text-sm">请尝试调整筛选条件或搜索关键词</div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateExportModal;