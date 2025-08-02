'use client';

import React, { useState } from 'react';
import TemplateExportModal from './TemplateExportModal';

interface TemplateImageExporterProps {
  templateName: string;
  overwatchCode: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

const TemplateImageExporter: React.FC<TemplateImageExporterProps> = ({
  templateName,
  overwatchCode,
  onExportStart,
  onExportComplete,
  onExportError
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap"
        title="导出为表情包"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        表情包
      </button>
      
      {isModalOpen && (
         <TemplateExportModal
           isOpen={isModalOpen}
           templateName={templateName}
           overwatchCode={overwatchCode}
           onClose={handleCloseModal}
           onExportComplete={() => {
             onExportComplete?.();
             handleCloseModal();
           }}
           onExportError={onExportError}
         />
       )}
    </>
  );
};

export default TemplateImageExporter;