/**
 * Chart Export Utilities
 * Provides functionality to export charts as PNG images using html2canvas
 */

import html2canvas from 'html2canvas';

/**
 * Export a chart element as PNG image
 *
 * @param elementId - ID of the DOM element to capture
 * @param filename - Desired filename for the download
 * @returns Promise that resolves when export is complete
 */
export async function exportChartAsPNG(
  elementId: string,
  filename: string = 'chart.png'
): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      // Cleanup
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw new Error('Failed to export chart as PNG');
  }
}

/**
 * Export chart with dark mode support
 */
export async function exportChartWithTheme(
  elementId: string,
  filename: string = 'chart.png',
  isDarkMode: boolean = false
): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: isDarkMode ? '#111827' : '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw new Error('Failed to export chart as PNG');
  }
}

/**
 * Export multiple charts as a single image
 */
export async function exportMultipleCharts(
  elementIds: string[],
  filename: string = 'charts.png',
  isDarkMode: boolean = false
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.backgroundColor = isDarkMode ? '#111827' : '#ffffff';
  container.style.padding = '20px';

  // Clone and append each chart
  for (const id of elementIds) {
    const element = document.getElementById(id);
    if (element) {
      const clone = element.cloneNode(true) as HTMLElement;
      container.appendChild(clone);
    }
  }

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: isDarkMode ? '#111827' : '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Copy chart to clipboard as image
 */
export async function copyChartToClipboard(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }

      // Copy to clipboard using Clipboard API
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
    }, 'image/png');
  } catch (error) {
    console.error('Error copying chart to clipboard:', error);
    throw new Error('Failed to copy chart to clipboard');
  }
}
