'use client';

import React, { useState, useRef } from 'react';

interface TextInputProps {
  onAddText: (text: string) => void;
  onAddColoredText: (text: string, color: string) => void;
  onAddGradientText: (text: string, startColor: string, endColor: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({ onAddText, onAddColoredText, onAddGradientText }) => {
  const [inputText, setInputText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [gradientStart, setGradientStart] = useState('#ff6600');
  const [gradientEnd, setGradientEnd] = useState('#0099ff');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const MAX_CHARACTERS = 1000;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARACTERS) {
      setInputText(value);
    }
  };

  const handleAddText = () => {
    if (inputText.trim()) {
      onAddText(inputText.trim());
      setInputText('');
    }
  };

  const handleAddColoredText = () => {
    if (inputText.trim()) {
      onAddColoredText(inputText.trim(), textColor);
      setInputText('');
    }
  };

  const handleAddGradientText = () => {
    if (inputText.trim()) {
      onAddGradientText(inputText.trim(), gradientStart, gradientEnd);
      setInputText('');
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✏️</span>
          <h3 className="text-lg font-semibold text-orange-400">文字输入</h3>
        </div>
      </div>
      
      {/* 文本输入框 */}
      <div className="mb-6">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder="输入文字内容..."
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none"
          rows={5}
        />
        <div className="flex justify-between items-center mt-2">
          <div className={`text-sm ${
            inputText.length > MAX_CHARACTERS * 0.9 
              ? 'text-red-400' 
              : inputText.length > MAX_CHARACTERS * 0.8 
              ? 'text-yellow-400' 
              : 'text-gray-400'
          }`}>
            {inputText.length}/{MAX_CHARACTERS} 字符
          </div>
          {inputText.length >= MAX_CHARACTERS && (
            <div className="text-xs text-red-400">
              已达到字符上限
            </div>
          )}
        </div>
        {inputText && (
          <button
            onClick={() => setInputText('')}
            className="mt-3 px-4 py-2 text-sm bg-gray-700/70 hover:bg-gray-600/70 text-gray-300 rounded-lg transition-all duration-200 border border-gray-600/50"
          >
            清空
          </button>
        )}
      </div>

     {/* 颜色设置区域 */}
     <div className="mb-6">
       <div className="text-sm font-semibold text-gray-300 mb-3">颜色设置:</div>
       
       {/* 单色设置 */}
       <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
         <div className="text-sm text-gray-300 mb-2 font-medium">单色:</div>
         <div className="flex items-center gap-3">
           <input
             type="color"
             value={textColor}
             onChange={(e) => setTextColor(e.target.value)}
             className="w-10 h-10 border-2 border-gray-600 rounded-lg cursor-pointer bg-gray-800"
           />
           <span className="text-sm text-gray-400 font-mono">{textColor}</span>
         </div>
       </div>

       {/* 渐变设置 */}
       <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
         <div className="text-sm text-gray-300 mb-2 font-medium">渐变:</div>
         <div className="space-y-3">
           <div className="flex items-center gap-3">
             <span className="text-sm text-gray-400 w-10">起:</span>
             <input
               type="color"
               value={gradientStart}
               onChange={(e) => setGradientStart(e.target.value)}
               className="w-8 h-8 border-2 border-gray-600 rounded-lg cursor-pointer bg-gray-800"
             />
             <span className="text-sm text-gray-400 flex-1 font-mono">{gradientStart}</span>
           </div>
           <div className="flex items-center gap-3">
             <span className="text-sm text-gray-400 w-10">终:</span>
             <input
               type="color"
               value={gradientEnd}
               onChange={(e) => setGradientEnd(e.target.value)}
               className="w-8 h-8 border-2 border-gray-600 rounded-lg cursor-pointer bg-gray-800"
             />
             <span className="text-sm text-gray-400 flex-1 font-mono">{gradientEnd}</span>
           </div>
           {/* 渐变预览 */}
           <div 
             className="h-6 rounded-lg border-2 border-gray-600"
             style={{
               background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`
             }}
           ></div>
         </div>
       </div>

       {/* 添加按钮 */}
       <div className="space-y-3">
         <button
           onClick={handleAddText}
           disabled={!inputText.trim()}
           className="w-full px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm rounded-lg hover:from-gray-500 hover:to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-gray-600/50"
         >
           添加文字
         </button>
         <button
           onClick={handleAddColoredText}
           disabled={!inputText.trim()}
           className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-lg hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-blue-600/50"
         >
           彩色文字
         </button>
         <button
           onClick={handleAddGradientText}
           disabled={!inputText.trim()}
           className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm rounded-lg hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-orange-600/50"
         >
           渐变文字
         </button>
       </div>
     </div>
    </div>
  );
};

export default TextInput;