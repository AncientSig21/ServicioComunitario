import { useState, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

// Configurar el worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFViewerProps {
  fileUrl: string;
  onlyFirstPage?: boolean;
  isAuthenticated?: boolean;
  showDownloadButtons?: boolean;
}

export const PDFViewer = ({ fileUrl, onlyFirstPage = false, isAuthenticated = false, showDownloadButtons = false }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resetear estado cuando cambia la URL
  useEffect(() => {
    setNumPages(1);
    setPageNumber(1);
    setScale(1);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = () => {
    // Error silencioso
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  // Funciones para zoom
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  // Memoizar las opciones para evitar re-renders innecesarios
  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
    disableFontFace: false,
    disableRange: false,
    disableStream: false,
  }), []);

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full h-full overflow-hidden">
      {/* Controles de navegación y acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2 w-full">
        {/* Controles de navegación */}
        {numPages > 1 && (
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="px-2 sm:px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm sm:text-base"
            >
              ←
            </button>
            <span className="text-xs sm:text-sm">
              Página {pageNumber} de {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="px-2 sm:px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm sm:text-base"
            >
              →
            </button>
          </div>
        )}
        
        {/* Controles de zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm"
            title="Reducir zoom"
          >
            🔍-
          </button>
          <span className="text-xs">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm"
            title="Aumentar zoom"
          >
            🔍+
          </button>
        </div>
        
        {/* Botones de acción - solo para usuarios autenticados y si showDownloadButtons es true */}
        {isAuthenticated && showDownloadButtons && (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => window.open(fileUrl, '_blank')}
              className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Abrir en nueva ventana</span>
              <span className="sm:hidden">Abrir</span>
            </button>
            <a
              href={fileUrl}
              download
              className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Descargar PDF</span>
              <span className="sm:hidden">Descargar</span>
            </a>
          </div>
        )}
      </div>
      
      {/* Contenedor del PDF con scroll */}
      <div className="w-full flex-1 overflow-auto border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex justify-center p-4">
          {/* PDF renderizado - Mostrar siempre si hay URL */}
          {fileUrl && (
            <>
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Cargando PDF...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-red-500 text-6xl mb-4">📄</div>
                    <p className="text-red-500 text-lg mb-2">Error al cargar el PDF</p>
                    <p className="text-gray-600 text-sm mb-4">El PDF no se puede mostrar en el visor</p>
                    <p className="text-gray-500 text-xs mb-4">Intente usar los botones de abajo para abrir o descargar el PDF</p>
                  </div>
                }
                options={pdfOptions}
              >
                <Page
                  pageNumber={onlyFirstPage ? 1 : pageNumber}
                  width={Math.min(window.innerWidth * 0.8, 800) * scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  scale={scale}
                  onLoadError={(error) => {
                    console.error('Error al renderizar página:', error);
                  }}
                />
              </Document>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 