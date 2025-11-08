'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { slugify } from '@/lib/client-utils';

// Helper function to clean and normalize mermaid code content
function cleanMermaidCode(content: string): string {
  if (!content) return '';
  
  // Split by newlines and process each line
  const lines = content.split(/\r?\n/);
  
  // Remove empty lines at the start and end
  let startIdx = 0;
  let endIdx = lines.length - 1;
  
  while (startIdx < lines.length && lines[startIdx].trim() === '') {
    startIdx++;
  }
  while (endIdx >= startIdx && lines[endIdx].trim() === '') {
    endIdx--;
  }
  
  // Process lines: trim each line but preserve relative indentation
  const processedLines = lines.slice(startIdx, endIdx + 1).map(line => {
    // Trim trailing whitespace but preserve leading spaces for indentation
    return line.replace(/\s+$/, '');
  });
  
  // Join lines with single newline
  let cleaned = processedLines.join('\n');
  
  // Remove excessive blank lines (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim final result
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Helper function to fix Mermaid grammar errors, especially colons in labels
function fixMermaidGrammar(content: string): string {
  if (!content) return '';
  
  // Check if this is a state diagram
  const isStateDiagram = /stateDiagram/i.test(content);
  
  if (!isStateDiagram) {
    // For non-state diagrams, return as-is
    return content;
  }
  
  // Split into lines to process each line individually
  const lines = content.split(/\r?\n/);
  const fixedLines = lines.map(line => {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) {
      return line;
    }
    
    // Pattern 1: Fix transition labels with colons: --> State: Label: More text
    // Match: --> State: Label with colon
    // This pattern matches transitions like: State1 --> State2: Action: Description
    // Match pattern: arrow, state, colon, then label that may contain colons
    const transitionPattern = /(-->|--|->)\s*([\w\[\]()*]+)\s*:\s*(.+)$/;
    
    let fixedLine = line;
    const transitionMatch = line.match(transitionPattern);
    
    if (transitionMatch) {
      const [, arrow, state, label] = transitionMatch;
      let processedLabel = label.trim();
      
      // Check if label contains a colon (indicating it needs replacement)
      if (processedLabel.includes(':')) {
        // If label is already quoted, unquote it first
        if ((processedLabel.startsWith('"') && processedLabel.endsWith('"')) ||
            (processedLabel.startsWith("'") && processedLabel.endsWith("'"))) {
          // Remove quotes
          processedLabel = processedLabel.slice(1, -1);
        }
        
        // Replace colons with dashes to avoid parse errors
        // Replace ": " (colon followed by space) with " - " (dash with spaces)
        // Replace ":" (colon without space) with " - " for better readability
        processedLabel = processedLabel.replace(/:\s+/g, ' - ').replace(/:/g, ' - ');
        
        // Find the position of the arrow in the original line
        const arrowIndex = line.indexOf(arrow);
        // Preserve everything before the arrow (indentation, state name, etc.)
        const beforeArrow = line.substring(0, arrowIndex);
        fixedLine = `${beforeArrow}${arrow} ${state}: ${processedLabel}`;
      }
    }
    
    // Pattern 2: Fix state descriptions with multiple colons: State: Description: More
    // This is for state definitions, not transitions
    // Match: State: Description: More text
    // But only if it's not a transition (doesn't start with -->)
    if (fixedLine === line && !trimmed.includes('-->') && !trimmed.includes('--') && !trimmed.includes('->')) {
      const stateDescPattern = /^(\s*)([\w\[\]()*]+)\s*:\s*(.+)$/;
      const stateMatch = trimmed.match(stateDescPattern);
      
      if (stateMatch) {
        const [, indent, stateName, desc] = stateMatch;
        let processedDesc = desc.trim();
        
        // Check if description contains colon
        if (processedDesc.includes(':')) {
          // If description is already quoted, unquote it first
          if ((processedDesc.startsWith('"') && processedDesc.endsWith('"')) ||
              (processedDesc.startsWith("'") && processedDesc.endsWith("'"))) {
            // Remove quotes
            processedDesc = processedDesc.slice(1, -1);
          }
          
          // Replace colons with dashes to avoid parse errors
          // Replace ": " (colon followed by space) with " - " (dash with spaces)
          // Replace ":" (colon without space) with " - " for better readability
          processedDesc = processedDesc.replace(/:\s+/g, ' - ').replace(/:/g, ' - ');
          
          // Preserve original indentation from the line
          const originalIndent = line.match(/^\s*/)?.[0] || '';
          fixedLine = `${originalIndent}${stateName}: ${processedDesc}`;
        }
      }
    }
    
    return fixedLine;
  });
  
  return fixedLines.join('\n');
}

// Mermaid component for ReactMarkdown
function MermaidCodeBlock(props: any) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidError, setMermaidError] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [htmlContent, setHtmlContent] = useState('<div class="text-sm text-gray-600"><p>Đang render Mermaid diagram...</p></div>');
  const isMountedRef = useRef(true);
  
  // Extract code content from children - handle multiple formats
  const rawCodeContent = useMemo(() => {
    // Case 1: Direct string
    if (typeof props.children === 'string') {
      return props.children;
    }
    
    // Case 2: Array of strings
    if (Array.isArray(props.children)) {
      return props.children
        .map((child: any) => {
          if (typeof child === 'string') return child;
          if (typeof child === 'object' && child?.props?.children) {
            return String(child.props.children);
          }
          return String(child);
        })
        .join('');
    }
    
    // Case 3: React element with children
    if (props.children && typeof props.children === 'object') {
      // Try props.children directly
      if (typeof props.children.props?.children === 'string') {
        return props.children.props.children;
      }
      // Try to extract from nested structure
      if (props.children.props?.children) {
        const children = props.children.props.children;
        if (Array.isArray(children)) {
          return children.map((c: any) => String(c)).join('');
        }
        return String(children);
      }
      // Fallback: try to stringify the whole thing
      if (props.children.props) {
        return String(props.children.props.children || props.children.props);
      }
    }
    
    return '';
  }, [props.children]);

  // Clean and normalize the code content, then fix grammar errors
  const codeContent = useMemo(() => {
    const cleaned = cleanMermaidCode(rawCodeContent);
    return fixMermaidGrammar(cleaned);
  }, [rawCodeContent]);

  // Check if this is a mermaid code block
  const isMermaid = useMemo(() => {
    const className = props.className || '';
    const match = /language-(\w+)/.exec(className);
    return match && match[1] === 'mermaid';
  }, [props.className]);

  // Track mounting state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize mermaid once - ensure it's ready (moved outside component for better performance)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if mermaid is available
    if (!mermaid || typeof mermaid.initialize !== 'function') {
      console.warn('Mermaid is not available');
      return;
    }
    
    // Initialize mermaid with configuration
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Arial, sans-serif',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true
        },
        sequence: {
          useMaxWidth: true
        },
        gantt: {
          useMaxWidth: true
        }
      });
    } catch (error) {
      console.error('Failed to initialize mermaid:', error);
    }
  }, []);

  // Render mermaid diagram
  useEffect(() => {
    if (!isMermaid || !codeContent.trim()) {
      setIsRendering(false);
      return;
    }

    // Helper function to wait for ref with retry
    const waitForRef = async (maxRetries = 10, delay = 100): Promise<HTMLDivElement | null> => {
      for (let i = 0; i < maxRetries; i++) {
        if (mermaidRef.current) {
          return mermaidRef.current;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return null;
    };

    // Wait for mermaid to be ready and ref to be available
    const renderMermaid = async () => {
      console.log('[Mermaid] Starting render, isMermaid:', isMermaid, 'hasContent:', !!codeContent);
      
      // Wait for ref to be set with retry mechanism
      const refElement = await waitForRef(10, 100);
      
      if (!refElement || !isMountedRef.current) {
        console.warn('[Mermaid] Ref not available after retries or component unmounted');
        if (isMountedRef.current) {
          setIsRendering(false);
        }
        return;
      }

      try {
        if (!isMountedRef.current) {
          console.log('[Mermaid] Component unmounted, aborting render');
          return;
        }
        
        setIsRendering(true);
        setMermaidError(false);
        
        // Check if mermaid is initialized
        if (!mermaid || typeof mermaid.render !== 'function') {
          throw new Error('Mermaid is not available');
        }
        
        // Double check ref is still available
        if (!mermaidRef.current || !isMountedRef.current) {
          return;
        }
        
        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render mermaid diagram using render API
        // Code content is already cleaned by cleanMermaidCode
        if (!codeContent || codeContent.trim().length === 0) {
          throw new Error('Mermaid code content is empty');
        }

        console.log('[Mermaid] Calling mermaid.render with id:', id);
        const result = await mermaid.render(id, codeContent);
        console.log('[Mermaid] Render result:', result ? 'success' : 'null', 'hasSVG:', !!result?.svg);
        
        // Check if component is still mounted
        if (!isMountedRef.current || !mermaidRef.current) {
          console.log('[Mermaid] Component unmounted after render');
          return;
        }
        
        // Check if result is valid
        if (!result) {
          throw new Error('Mermaid render returned null or undefined');
        }
        
        // Check if svg exists in result
        if (!result.svg) {
          throw new Error('Mermaid render result does not contain SVG');
        }
        
        // Final check before inserting SVG
        if (!mermaidRef.current || !isMountedRef.current) {
          console.log('[Mermaid] Ref lost before inserting SVG');
          return;
        }
        
        // Update HTML content with SVG
        console.log('[Mermaid] Setting SVG content');
        if (isMountedRef.current) {
          setHtmlContent(result.svg);
          console.log('[Mermaid] SVG content set, length:', result.svg.length);
          console.log('[Mermaid] Setting isRendering to false');
          setIsRendering(false);
        }
      } catch (error: any) {
        if (!isMountedRef.current) return;
        
        console.error('Mermaid rendering error:', error);
        console.error('Error message:', error.message || error);
        console.error('Code content (raw):', rawCodeContent);
        console.error('Code content (cleaned):', codeContent);
        
        // Extract error message
        const errorMessage = error.message || String(error);
        
        // Retry once if ref was not available
        if (errorMessage === 'Mermaid ref is not available' || errorMessage?.includes('ref')) {
          console.warn('Retrying mermaid render after ref error...');
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 200));
          if (mermaidRef.current && isMountedRef.current) {
            try {
              const id = `mermaid-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const result = await mermaid.render(id, codeContent);
              if (result?.svg && isMountedRef.current) {
                setHtmlContent(result.svg);
                setIsRendering(false);
                return;
              }
            } catch (retryError) {
              console.error('Mermaid retry also failed:', retryError);
            }
          }
        }
        
        // Escape HTML in error message and code to prevent XSS
        const escapeHtml = (str: string) => {
          return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };
        
        // Set error HTML content with detailed error message
        const errorHtml = `
          <div class="p-4 bg-red-50 border border-red-200 rounded text-sm text-black">
            <p class="font-medium text-red-600">Lỗi khi render Mermaid diagram</p>
            <p class="text-xs mt-2 text-gray-700">
              Vui lòng kiểm tra syntax của Mermaid code. Có thể có lỗi parse hoặc format không đúng.
            </p>
            ${errorMessage ? `
              <div class="mt-3 p-3 bg-white border border-gray-300 rounded">
                <p class="text-xs font-semibold text-gray-800 mb-1">Chi tiết lỗi:</p>
                <pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">${escapeHtml(errorMessage)}</pre>
              </div>
            ` : ''}
            <details class="mt-3">
              <summary class="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
                Xem code content
              </summary>
              <pre class="mt-2 text-xs bg-white p-2 rounded overflow-x-auto whitespace-pre-wrap border border-gray-300 font-mono">${escapeHtml(codeContent || rawCodeContent)}</pre>
            </details>
          </div>
        `;
        setHtmlContent(errorHtml);
        setMermaidError(true);
        setIsRendering(false);
      }
    };

    renderMermaid();

    // Cleanup function - mark as unmounted when effect cleanup runs
    return () => {
      isMountedRef.current = false;
    };
  }, [isMermaid, codeContent, rawCodeContent]);

  // If not mermaid, render as normal code block
  if (!isMermaid) {
    return <code {...props}>{props.children}</code>;
  }

  // Always render div with ref, use dangerouslySetInnerHTML to avoid React/DOM conflicts
  return (
    <div 
      ref={mermaidRef}
      className="my-4 mermaid text-center bg-gray-50 border border-gray-200 rounded-lg p-5"
      style={{ 
        textAlign: 'center',
        margin: '20px 0',
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e9ecef',
        minHeight: '100px'
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

// Pre component wrapper for mermaid
function MermaidPreBlock(props: any) {
  // Check if this pre contains a mermaid code block
  const isMermaid = useMemo(() => {
    // ReactMarkdown wraps code in pre, so children should be a code element
    const codeElement = props.children;
    
    // Check if it's a code element with mermaid class
    if (codeElement?.props?.className) {
      const className = codeElement.props.className || '';
      const match = /language-(\w+)/.exec(className);
      return match && match[1] === 'mermaid';
    }
    
    // Also check className directly on props (sometimes ReactMarkdown passes it differently)
    if (props.className) {
      const match = /language-(\w+)/.exec(props.className);
      return match && match[1] === 'mermaid';
    }
    
    return false;
  }, [props.children, props.className]);

  // If mermaid, let MermaidCodeBlock handle it
  if (isMermaid && props.children?.props) {
    // Pass all props from code element to MermaidCodeBlock
    return <MermaidCodeBlock {...props.children.props} />;
  }

  // Otherwise render as normal pre
  return <pre {...props}>{props.children}</pre>;
}

// Image component for ReactMarkdown with error handling
function MarkdownImage(props: any) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Handle both absolute paths and relative paths
  const imageSrc = props.src || '';
  
  // Use useMemo to compute finalSrc and ensure it updates when src changes
  const finalSrc = useMemo(() => {
    if (!imageSrc) return '';
    
    // If it's already an absolute URL, use it as is
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return imageSrc;
    }
    
    // For relative paths, ensure they start with /
    let normalizedPath = imageSrc.startsWith('/') ? imageSrc : `/${imageSrc}`;
    
    // Convert /assets/images/... to /api/images/... for Next.js preview
    // This allows the API route to serve the image dynamically
    if (normalizedPath.startsWith('/assets/images/')) {
      // Remove leading /assets/images/ and use API route
      const imagePath = normalizedPath.replace('/assets/images/', '');
      return `/api/images/${imagePath}`;
    }
    
    return normalizedPath;
  }, [imageSrc]);
  
  // Reset error and loading state when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [imageSrc]);
  
  const handleError = () => {
    setImageError(true);
    setImageLoading(false);
  };
  
  const handleLoad = () => {
    setImageLoading(false);
  };
  
  if (imageError) {
    return (
      <div className="my-2 p-4 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600">
        <p className="font-medium">Image không thể tải</p>
        <p className="text-xs mt-1 text-gray-500">Path: {finalSrc}</p>
        <p className="text-xs mt-1 text-gray-400">Original: {imageSrc}</p>
      </div>
    );
  }
  
  return (
    <div className="my-2 relative">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <span className="text-xs text-gray-500">Đang tải...</span>
        </div>
      )}
      <img 
        {...props}
        src={finalSrc} 
        alt={props.alt || ''} 
        className="max-w-full h-auto rounded"
        onError={handleError}
        onLoad={handleLoad}
        key={finalSrc} // Force re-render when src changes
      />
    </div>
  );
}

interface PostEditorProps {
  initialData?: PostData & { filename?: string };
  onSave?: (data: PostData) => void;
  onPublish?: (data: PostData) => void;
}

export interface PostData {
  title: string;
  content: string;
  slug: string;
  categories: string;
  tags: string;
  math: boolean;
}

export default function PostEditor({ initialData, onSave, onPublish }: PostEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [categories, setCategories] = useState('');
  const [tags, setTags] = useState('');
  const [math, setMath] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
      setSlug(initialData.slug || '');
      setCategories(initialData.categories || '');
      setTags(initialData.tags || '');
      setMath(initialData.math || false);
      setAutoSlug(false); // Disable auto-slug when editing
      if (initialData.filename) {
        setCurrentFilename(initialData.filename);
      }
    }
  }, [initialData]);

  // Auto-generate slug from title (only when not editing)
  useEffect(() => {
    if (autoSlug && title && !initialData) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug, initialData]);

  // Helper function to insert text at cursor position
  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(end);
    const newContent = textBefore + text + textAfter;
    
    setContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Upload image and insert markdown link
  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'File phải là hình ảnh' });
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use slug as subfolder if available, otherwise use a default folder
      if (slug.trim()) {
        formData.append('subfolder', slug.trim());
      }

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi upload image');
      }

      // Insert markdown image link at cursor position
      const imageMarkdown = `![${file.name}](${data.path})`;
      insertTextAtCursor(imageMarkdown);

      setMessage({ type: 'success', text: 'Image đã được upload và chèn vào editor' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng kéo thả file hình ảnh' });
      return;
    }

    // Upload first image (can be extended to handle multiple images)
    await uploadAndInsertImage(imageFiles[0]);
  };

  // Handle paste
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        await uploadAndInsertImage(file);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ title, content và slug' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/posts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
          filename: currentFilename, // Include filename if editing
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi lưu post');
      }

      // Update current filename if it was a new post
      if (data.filename && !currentFilename) {
        setCurrentFilename(data.filename);
      }

      setMessage({ type: 'success', text: data.message || 'Post đã được lưu thành công' });
      
      if (onSave) {
        onSave({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ title, content và slug' });
      return;
    }

    setIsPublishing(true);
    setMessage(null);

    try {
      // First save
      const saveResponse = await fetch('/api/posts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
          filename: currentFilename, // Include filename if editing
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Lỗi khi lưu post');
      }

      // Update current filename if it was a new post
      if (saveData.filename && !currentFilename) {
        setCurrentFilename(saveData.filename);
      }

      // Then publish
      const publishResponse = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: saveData.filename,
          title: title.trim(),
        }),
      });

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        throw new Error(publishData.error || 'Lỗi khi publish post');
      }

      setMessage({ 
        type: 'success', 
        text: publishData.message || 'Post đã được publish thành công lên GitHub' 
      });

      if (onPublish) {
        onPublish({
          title: title.trim(),
          content: content.trim(),
          slug: slug.trim(),
          categories: categories.trim(),
          tags: tags.trim(),
          math,
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6 space-y-6">
        <h1 className="text-3xl font-bold mb-6">Jekyll Post Editor</h1>

        {message && (
          <div
            className={`p-4 rounded ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tiêu đề bài viết"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="url-friendly-slug"
              />
              <button
                type="button"
                onClick={() => {
                  setAutoSlug(true);
                  if (title) {
                    setSlug(slugify(title));
                  }
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
              >
                Auto
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Slug sẽ được dùng để tạo tên file (YYYY-MM-DD-slug.md)
            </p>
          </div>

          {/* Content Split View */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content (Markdown) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px] lg:h-[600px]">
              {/* Editor Panel */}
              <div 
                className={`flex flex-col border rounded-md overflow-hidden bg-white shadow-sm transition-colors ${
                  isDragging 
                    ? 'border-blue-500 border-2 bg-blue-50' 
                    : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 text-xs font-medium text-gray-700 flex items-center justify-between">
                  <span>Editor</span>
                  {isUploadingImage && (
                    <span className="text-blue-600 text-xs">Đang upload image...</span>
                  )}
                  {isDragging && (
                    <span className="text-blue-600 text-xs">Thả image vào đây</span>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handlePaste}
                  className="flex-1 w-full px-4 py-2 border-0 rounded-md focus:outline-none focus:ring-0 font-mono text-sm resize-none"
                  placeholder="Viết nội dung bài viết bằng Markdown... (Có thể kéo thả hoặc paste image)"
                />
              </div>

              {/* Preview Panel */}
              <div className="flex flex-col border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm">
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 text-xs font-medium text-gray-700">
                  Preview
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-sm prose-gray max-w-none">
                  {content ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: MarkdownImage,
                        code: (props: any) => {
                          // Check if it's a mermaid code block
                          const className = props.className || '';
                          const match = /language-(\w+)/.exec(className);
                          const isMermaid = match && match[1] === 'mermaid';
                          
                          if (isMermaid) {
                            return <MermaidCodeBlock {...props} />;
                          }
                          
                          // For inline code, render normally
                          if (props.inline) {
                            return <code {...props}>{props.children}</code>;
                          }
                          
                          // For code blocks, let pre handle it
                          return <code {...props}>{props.children}</code>;
                        },
                        pre: MermaidPreBlock,
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Preview sẽ hiển thị ở đây...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label htmlFor="categories" className="block text-sm font-medium mb-2">
              Categories (optional)
            </label>
            <input
              id="categories"
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="machine-learning, llm, fine-tuning (phân cách bằng dấu phẩy)"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-2">
              Tags (optional)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="LoRA, QLoRA, RLHF (phân cách bằng dấu phẩy)"
            />
          </div>

          {/* Math Support */}
          <div className="flex items-center">
            <input
              id="math"
              type="checkbox"
              checked={math}
              onChange={(e) => setMath(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="math" className="ml-2 text-sm font-medium">
              Enable Math Support (LaTeX)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || isPublishing}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPublishing ? 'Đang publish...' : 'Lưu & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

