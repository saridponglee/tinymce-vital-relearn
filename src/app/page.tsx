'use client';

import React, { useRef, useState, useCallback, ChangeEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import TinyMCE Editor with no SSR to prevent hydration errors
const Editor = dynamic(
  () => import('@tinymce/tinymce-react').then((mod) => ({ default: mod.Editor })),
  { 
    ssr: false,
    loading: () => <div style={{ 
      height: '10000px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      color: '#6b7280'
    }}>Loading editor...</div>
  }
);

// Mock Supabase client - ENHANCED with autosave
const mockSupabase = {
  from: (table: string) => ({
    insert: async (data: any) => {
      console.log(`Inserting into ${table}:`, data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { data: [{ ...data, id: Math.floor(Math.random() * 1000) }], error: null };
    },
    // ADD: Draft autosave method
    upsert: async (data: any) => {
      console.log(`Auto-saving draft:`, data);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data: [{ ...data, id: data.id || Math.floor(Math.random() * 1000) }], error: null };
    }
  })
};

// EXACT interface - copy precisely
interface ArticleData {
  title: string;
  slug: string;
  author_name: string;
  category: string;
  published_at: string | null;
  content: string;
  article_status: 'published' | 'draft';
  hashtags: string[];
  featured_article: boolean;
  summary_bullets: string[];
  table_of_contents: string[];
  featured_image?: string;
  references?: string[];
  created_at?: string;
  updated_at?: string;
  id?: number; // ADD: for autosave tracking
}

// ADD: Autosave status interface
interface AutosaveStatus {
  lastSaved: Date | null;
  isAutosaving: boolean;
  hasUnsavedChanges: boolean;
}

// EXACT theme colors with autosave indicators
const theme = {
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#dc2626',
  primary: '#3b82f6',
  success: '#059669',
  warning: '#f59e0b',
  autosave: '#10b981' // ADD: autosave indicator color
};

// EXACT FormField component - copy completely
const FormField = ({ 
  label, 
  htmlFor, 
  required = false, 
  children 
}: { 
  label: string; 
  htmlFor: string; 
  required?: boolean; 
  children: React.ReactNode; 
}) => (
  <div style={{ marginBottom: 'clamp(1rem, 4vw, 1.5rem)' }}>
    <label 
      htmlFor={htmlFor} 
      style={{ 
        display: 'block', 
        fontWeight: '600',
        marginBottom: 'clamp(0.25rem, 2vw, 0.5rem)',
        color: '#1a1a1a',
        fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
        lineHeight: '1.5'
      }}
    >
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    {children}
  </div>
);

// ENHANCED LoadingSpinner with autosave variant
const LoadingSpinner = ({ variant = 'primary' }: { variant?: 'primary' | 'autosave' }) => (
  <div style={{ 
    display: 'inline-block', 
    width: 'clamp(18px, 4.5vw, 22px)', 
    height: 'clamp(18px, 4.5vw, 22px)', 
    border: '2px solid #f3f3f3', 
    borderTop: variant === 'autosave' ? `2px solid ${theme.autosave}` : `2px solid ${theme.primary}`, 
    borderRadius: '50%', 
    animation: 'spin 1s linear infinite',
    marginRight: 'clamp(8px, 2vw, 12px)'
  }}>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

// ADD: Autosave Status Indicator
const AutosaveIndicator = ({ 
  autosaveStatus 
}: { 
  autosaveStatus: AutosaveStatus 
}) => {
  const getStatusText = () => {
    if (autosaveStatus.isAutosaving) return 'Saving...';
    if (!autosaveStatus.lastSaved) return 'Not saved';
    if (autosaveStatus.hasUnsavedChanges) return 'Unsaved changes';
    
    const timeSince = Math.floor((Date.now() - autosaveStatus.lastSaved.getTime()) / 1000);
    if (timeSince < 60) return `Saved ${timeSince}s ago`;
    const minutesSince = Math.floor(timeSince / 60);
    return `Saved ${minutesSince}m ago`;
  };

  const getStatusColor = () => {
    if (autosaveStatus.isAutosaving) return theme.warning;
    if (!autosaveStatus.lastSaved || autosaveStatus.hasUnsavedChanges) return theme.error;
    return theme.autosave;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 'clamp(1rem, 4vw, 1.5rem)',
      left: 'clamp(1rem, 4vw, 1.5rem)',
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(8px, 2vw, 12px)',
      padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
      backgroundColor: theme.surface,
      border: `2px solid ${getStatusColor()}`,
      borderRadius: 'clamp(8px, 2vw, 12px)',
      fontSize: 'clamp(0.75rem, 3vw, 0.875rem)',
      fontWeight: '500',
      color: getStatusColor(),
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {autosaveStatus.isAutosaving && <LoadingSpinner variant="autosave" />}
      <div style={{
        width: 'clamp(8px, 2vw, 10px)',
        height: 'clamp(8px, 2vw, 10px)',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        flexShrink: 0,
        opacity: autosaveStatus.isAutosaving ? 0 : 1,
        transition: 'opacity 0.3s ease'
      }} />
      {getStatusText()}
    </div>
  );
};

const RichTextEditor = ({ 
  content, 
  onChange, 
  theme, 
  hasError 
}: { 
  content: string; 
  onChange: (content: string) => void; 
  theme: any;
  hasError: boolean;
}) => {
  const editorRef = useRef<any>(null);

  // Custom button functions
  const insertThickSeparator = useCallback(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.insertContent(`
        <hr class="thick-separator" style="
          border: none !important;
          border-top: 4px solid ${theme.text} !important;
          margin: 2rem 0 !important;
          width: 100% !important;
          opacity: 0.8 !important;
          height: 4px !important;
          background: none !important;
        " />
      `);
    }
  }, [theme.text]);

  const insertThinSeparator = useCallback(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.insertContent(`
        <hr class="thin-separator" style="
          border: none !important;
          border-top: 1px solid ${theme.textSecondary} !important;
          margin: 1.5rem auto !important;
          width: 60% !important;
          opacity: 0.6 !important;
          height: 1px !important;
          background: none !important;
        " />
      `);
    }
  }, [theme.textSecondary]);

  const insertMathEquation = useCallback(() => {
    const equation = prompt('Enter your math equation:', 'E = mc²');
    if (equation && editorRef.current) {
      const editor = editorRef.current;
      editor.insertContent(`
        <span class="math-equation" contenteditable="false" style="
          display: inline-block !important;
          padding: 8px 12px !important;
          margin: 0 4px !important;
          background-color: ${theme.surface} !important;
          border: 1px solid ${theme.border} !important;
          border-radius: 4px !important;
          font-family: 'Times New Roman', serif !important;
          font-style: italic !important;
          font-size: 16px !important;
          color: ${theme.text} !important;
          cursor: pointer !important;
        ">${equation}</span>
      `);
    }
  }, [theme]);

  // TinyMCE configuration
  const editorConfig = {
    height: 10000,
    menubar: true,
    branding: false,
    promotion: false,
    placeholder: 'Start writing your article here...',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount',
      'emoticons', 'codesample'
    ],
    toolbar: [
      'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough',
      'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent',
      'removeformat | link image media table emoticons codesample',
      'thick_separator thin_separator math_equation | code fullscreen help'
    ],
    toolbar_mode: 'wrap' as const,
    toolbar_sticky: true,
    toolbar_sticky_offset: 0,
    // Touch-friendly menu configuration
    menu: {
      file: { title: 'File', items: 'newdocument restoredraft | preview | export print | deleteallconversations' },
      edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace' },
      view: { title: 'View', items: 'code | visualaid visualchars visualblocks | spellchecker | preview fullscreen' },
      insert: { title: 'Insert', items: 'image link media addcomment pageembed template codesample inserttable | charmap emoticons hr | pagebreak nonbreaking anchor tableofcontents | insertdatetime' },
      format: { title: 'Format', items: 'bold italic underline strikethrough superscript subscript codeformat | styles blocks fontfamily fontsize align lineheight | forecolor backcolor | language | removeformat' },
      tools: { title: 'Tools', items: 'spellchecker spellcheckerlanguage | a11ycheck code wordcount' },
      table: { title: 'Table', items: 'inserttable | cell row column | advtablesort | tableprops deletetable' },
      help: { title: 'Help', items: 'help' }
    },
    font_family_formats: [
      'System Default=system-ui,sans-serif',
      'Sarabun=Sarabun,sans-serif',
      'Noto Sans Thai=Noto Sans Thai,sans-serif', 
      'Kanit=Kanit,sans-serif',
      'Prompt=Prompt,sans-serif',
      'Arial=arial,helvetica,sans-serif',
      'Georgia=georgia,palatino,serif',
      'Times New Roman=times new roman,times,serif',
      'Courier New=courier new,courier,monospace',
      'Verdana=verdana,geneva,sans-serif'
    ].join('; '),
    font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt 48pt',
    content_style: `
      body { 
        font-family: 'Sarabun', 'Noto Sans Thai', system-ui, sans-serif; 
        font-size: 16px;
        line-height: 1.6;
        color: ${theme.text};
        background-color: ${theme.surface};
        margin: 1rem;
      }
      h1 { font-family: 'Kanit', 'Sarabun', sans-serif; font-size: 2rem; font-weight: 700; }
      h2 { font-family: 'Kanit', 'Sarabun', sans-serif; font-size: 1.75rem; font-weight: 600; }
      h3 { font-family: 'Prompt', 'Kanit', sans-serif; font-size: 1.5rem; font-weight: 600; }
      h4 { font-family: 'Prompt', 'Sarabun', sans-serif; font-size: 1.25rem; font-weight: 600; }
      p { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
      .thick-separator:hover { border-top-color: ${theme.primary} !important; opacity: 1 !important; }
      .thin-separator:hover { border-top-color: ${theme.primary} !important; opacity: 1 !important; }
      .math-equation:hover { 
        background-color: ${theme.primary} !important; 
        color: #ffffff !important; 
        border-color: ${theme.primary} !important; 
      }
      .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before {
        color: ${theme.textSecondary};
        font-style: italic;
      }
    `,
    // Touch-friendly UI customization
    skin: 'oxide',
    content_css: 'default',
    toolbar_items_size: 'large',
    setup: (editor: any) => {
      // Register custom buttons
      editor.ui.registry.addButton('thick_separator', {
        text: '━━━',
        tooltip: 'Insert Thick Separator',
        onAction: () => insertThickSeparator()
      });

      editor.ui.registry.addButton('thin_separator', {
        text: '──',
        tooltip: 'Insert Thin Separator', 
        onAction: () => insertThinSeparator()
      });

      editor.ui.registry.addButton('math_equation', {
        text: '∑',
        tooltip: 'Insert Math Equation',
        onAction: () => insertMathEquation()
      });

      // Store editor reference
      editor.on('init', () => {
        editorRef.current = editor;
        console.log('TinyMCE editor initialized successfully');
        
        // Add touch-friendly CSS after editor initialization
        const editorDoc = editor.getDoc();
        const style = editorDoc.createElement('style');
        style.textContent = `
          /* Touch-friendly toolbar styling */
          .tox .tox-toolbar__group {
            margin: 0 4px !important;
          }
          
          .tox .tox-tbtn {
            height: 48px !important;
            width: 48px !important;
            margin: 2px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          
          .tox .tox-tbtn:hover {
            background-color: ${theme.primary}20 !important;
            transform: scale(1.05) !important;
            transition: all 0.2s ease !important;
          }
          
          .tox .tox-tbtn--enabled {
            background-color: ${theme.primary} !important;
            color: white !important;
          }
          
          .tox .tox-menubar {
            padding: 8px 0 !important;
          }
          
          .tox .tox-mbtn {
            height: 44px !important;
            padding: 0 16px !important;
            margin: 0 4px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          
          .tox .tox-mbtn:hover {
            background-color: ${theme.primary}20 !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
          }
          
          .tox .tox-menu {
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
            border: 2px solid ${theme.border} !important;
          }
          
          .tox .tox-collection__item {
            height: 48px !important;
            padding: 12px 16px !important;
            margin: 2px 4px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          
          .tox .tox-collection__item:hover {
            background-color: ${theme.primary}20 !important;
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
          }
          
          .tox .tox-toolbar {
            padding: 8px !important;
            border: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
          }
          
          .tox .tox-toolbar-overlord {
            background-color: ${theme.surface} !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Touch-friendly dropdown and select styling */
          .tox .tox-selectfield select,
          .tox .tox-listbox__select-label {
            height: 44px !important;
            padding: 8px 12px !important;
            font-size: 16px !important;
            border-radius: 8px !important;
            touch-action: manipulation !important;
            min-width: 120px !important;
            width: auto !important;
          }
          
          /* Touch-friendly split button styling */
          .tox .tox-split-button {
            border-radius: 8px !important;
            min-width: 120px !important;
            width: auto !important;
          }
          
          .tox .tox-split-button__chevron {
            width: 20px !important;
            height: 48px !important;
          }
          
          .tox .tox-split-button__primary {
            height: 48px !important;
            padding: 0 16px !important;
            min-width: 100px !important;
            width: auto !important;
            white-space: nowrap !important;
          }
          
          /* Hide all horizontal grey separator lines */
          .tox .tox-toolbar__group:not(:last-of-type)::after,
          .tox .tox-toolbar__overflow--open .tox-toolbar__group:not(:last-of-type)::after,
          .tox-toolbar__primary .tox-toolbar__group:not(:last-of-type)::after,
          .tox-toolbar-overlord .tox-toolbar__group:not(:last-of-type)::after,
          .tox .tox-toolbar__group::after {
            display: none !important;
          }
          
          /* Hide separator between toolbar rows */
          .tox .tox-toolbar:not(.tox-toolbar--overflow)::after,
          .tox .tox-toolbar::after {
            display: none !important;
          }
          
          /* Hide menubar bottom border */
          .tox .tox-menubar {
            border-bottom: none !important;
          }
          
          /* Hide toolbar container borders */
          .tox .tox-toolbar-overlord {
            border-bottom: none !important;
          }
          
          /* Remove extra spacing that separators created */
          .tox .tox-toolbar__group {
            margin-right: 6px !important;
          }
          
          /* Ensure clean toolbar appearance */
          .tox .tox-toolbar {
            background: #f9fafb !important;
            border: none !important;
          }
          
          /* Clean menubar appearance */
          .tox .tox-menubar {
            background: #ffffff !important;
            border: none !important;
          }
          
          /* Hide any remaining separator elements */
          .tox .tox-separator,
          .tox .tox-toolbar__group-separator {
            display: none !important;
          }
        `;
        editorDoc.head.appendChild(style);
      });
    },
    // Mobile responsiveness
    mobile: {
      toolbar_mode: 'sliding' as const
    }
  };

  return (
    <>
      <style jsx global>{`
        /* Touch-friendly TinyMCE toolbar styling */
        .tox .tox-toolbar__group {
          margin: 0 4px !important;
        }
        
        .tox .tox-tbtn {
          height: 48px !important;
          min-width: 48px !important;
          width: auto !important;
          margin: 2px !important;
          border-radius: 8px !important;
          font-size: 16px !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
          padding: 0 12px !important;
        }
        
        .tox .tox-tbtn:hover {
          background-color: ${theme.primary}20 !important;
          transform: scale(1.05) !important;
          transition: all 0.2s ease !important;
        }
        
        .tox .tox-tbtn--enabled {
          background-color: ${theme.primary} !important;
          color: white !important;
        }
        
        .tox .tox-menubar {
          padding: 8px 0 !important;
        }
        
        .tox .tox-mbtn {
          height: 44px !important;
          padding: 0 16px !important;
          margin: 0 4px !important;
          border-radius: 8px !important;
          font-size: 16px !important;
          font-weight: 500 !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .tox .tox-mbtn:hover {
          background-color: ${theme.primary}20 !important;
          transform: scale(1.02) !important;
          transition: all 0.2s ease !important;
        }
        
        .tox .tox-menu {
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
          border: none !important;
        }
        
        .tox .tox-collection__item {
          height: 48px !important;
          padding: 12px 16px !important;
          margin: 2px 4px !important;
          border-radius: 8px !important;
          font-size: 16px !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .tox .tox-collection__item:hover {
          background-color: ${theme.primary}20 !important;
          transform: scale(1.02) !important;
          transition: all 0.2s ease !important;
        }
        
        .tox .tox-toolbar {
          padding: 8px !important;
          border: none !important;
          border-bottom: none !important;
          box-shadow: none !important;
        }
        
        .tox .tox-toolbar-overlord {
          background-color: ${theme.surface} !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Touch-friendly dropdown and select styling */
        .tox .tox-selectfield select,
        .tox .tox-listbox__select-label {
          height: 44px !important;
          padding: 8px 12px !important;
          font-size: 16px !important;
          border-radius: 8px !important;
          touch-action: manipulation !important;
          min-width: 120px !important;
          width: auto !important;
        }
        
        /* Touch-friendly split button styling */
        .tox .tox-split-button {
          border-radius: 8px !important;
          min-width: 120px !important;
          width: auto !important;
        }
        
        .tox .tox-split-button__chevron {
          width: 20px !important;
          height: 48px !important;
        }
        
        .tox .tox-split-button__primary {
          height: 48px !important;
          padding: 0 16px !important;
          min-width: 100px !important;
          width: auto !important;
          white-space: nowrap !important;
        }
        
        /* Hide all horizontal grey separator lines */
        .tox .tox-toolbar__group:not(:last-of-type)::after,
        .tox .tox-toolbar__overflow--open .tox-toolbar__group:not(:last-of-type)::after,
        .tox-toolbar__primary .tox-toolbar__group:not(:last-of-type)::after,
        .tox-toolbar-overlord .tox-toolbar__group:not(:last-of-type)::after,
        .tox .tox-toolbar__group::after {
          display: none !important;
        }
        
        /* Hide separator between toolbar rows */
        .tox .tox-toolbar:not(.tox-toolbar--overflow)::after,
        .tox .tox-toolbar::after {
          display: none !important;
        }
        
        /* Hide menubar bottom border */
        .tox .tox-menubar {
          border-bottom: none !important;
          background: #ffffff !important;
        }
        
        /* Hide toolbar container borders */
        .tox .tox-toolbar-overlord {
          border-bottom: none !important;
        }
        
        /* Ensure clean toolbar appearance */
        .tox .tox-toolbar {
          background: #f9fafb !important;
          border: none !important;
        }
        
        /* Remove extra spacing and hide separators */
        .tox .tox-toolbar__group {
          margin-right: 6px !important;
        }
        
        .tox .tox-separator,
        .tox .tox-toolbar__group-separator {
          display: none !important;
        }
        
        /* Touch-friendly dialog styling */
        .tox .tox-dialog {
          border-radius: 16px !important;
          box-shadow: 0 16px 64px rgba(0, 0, 0, 0.2) !important;
        }
        
        .tox .tox-dialog__header {
          padding: 16px 20px !important;
        }
        
        .tox .tox-dialog__body {
          padding: 20px !important;
        }
        
        .tox .tox-dialog__footer {
          padding: 16px 20px !important;
        }
        
        .tox .tox-button {
          height: 44px !important;
          padding: 0 20px !important;
          border-radius: 8px !important;
          font-size: 16px !important;
          font-weight: 500 !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .tox .tox-button:hover {
          transform: scale(1.02) !important;
          transition: all 0.2s ease !important;
        }
        
        /* Touch-friendly input fields in dialogs */
        .tox .tox-textfield,
        .tox .tox-textarea {
          height: 44px !important;
          padding: 12px 16px !important;
          font-size: 16px !important;
          border-radius: 8px !important;
          border: 2px solid ${theme.border} !important;
          touch-action: manipulation !important;
        }
        
        .tox .tox-textarea {
          height: auto !important;
          min-height: 88px !important;
        }
        
        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .tox .tox-toolbar {
            flex-wrap: wrap !important;
          }
          
          .tox .tox-tbtn {
            height: 52px !important;
            width: 52px !important;
            margin: 3px !important;
          }
          
          .tox .tox-mbtn {
            height: 48px !important;
            padding: 0 20px !important;
            margin: 0 6px !important;
          }
          
          .tox .tox-collection__item {
            height: 52px !important;
            padding: 16px 20px !important;
            font-size: 18px !important;
          }
        }
      `}</style>
      <div style={{
        border: `2px solid ${hasError ? theme.error : theme.border}`,
        borderRadius: '8px',
        backgroundColor: theme.surface,
        overflow: 'hidden',
        minHeight: '10000px'
      }}>
        <div suppressHydrationWarning>
          <Editor
            apiKey="wl4p3hpruyc1h75fgou8wnm83zmvosve1jkmqo4u3kecci46"
            value={content}
            onEditorChange={(newContent, editor) => {
              console.log('Editor content changed:', newContent);
              onChange(newContent);
            }}
            onInit={(evt, editor) => {
              console.log('TinyMCE initialized:', editor);
    editorRef.current = editor;
            }}
            init={editorConfig}
          />
        </div>
      </div>
    </>
  );
};

export default function MobileFirstEditor() {
  const editorContentRef = useRef<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftIdRef = useRef<number | null>(null);

  // EXACT form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    published_at: '',
    author_name: '',
    category: '',
    hashtags: ['', '', '', '', ''] as string[],
    summary_bullets: ['', '', '', '', ''] as string[],
    table_of_contents: ['', '', '', '', '', '', ''] as string[],
    featured_image: '',
    references: ['', '', '', '', '', '', ''] as string[],
    featured_article: false
  });

  // ADD: Autosave status state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>({
    lastSaved: null,
    isAutosaving: false,
    hasUnsavedChanges: false
  });

  // ADD: Autosave function
  const performAutosave = useCallback(async () => {
    // Check if there's meaningful content to save
    const hasTitle = formData.title.trim().length > 0;
    const hasContent = editorContentRef.current && editorContentRef.current.replace(/<[^>]*>/g, '').trim().length > 0;
    
    if (!hasTitle && !hasContent) {
      return; // Don't autosave empty content
    }

    setAutosaveStatus(prev => ({ ...prev, isAutosaving: true }));

    try {
      const draftPayload: ArticleData = {
        id: draftIdRef.current || undefined,
        title: formData.title.trim() || 'Untitled Draft',
        slug: formData.slug.trim() || `draft-${Date.now()}`,
        author_name: formData.author_name.trim() || 'Anonymous',
        category: formData.category.trim() || 'Uncategorized',
        published_at: formData.published_at || null,
        content: editorContentRef.current,
        article_status: 'draft',
        hashtags: formData.hashtags.filter(tag => tag.trim() !== ''),
        featured_article: formData.featured_article,
        summary_bullets: formData.summary_bullets.filter(bullet => bullet.trim() !== ''),
        table_of_contents: formData.table_of_contents.filter(item => item.trim() !== ''),
        featured_image: formData.featured_image.trim() || undefined,
        references: formData.references.filter(ref => ref.trim() !== ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await mockSupabase.from('articles').upsert([draftPayload]);
      
      if (!error && data && data[0]) {
        draftIdRef.current = data[0].id;
        setAutosaveStatus({
          lastSaved: new Date(),
          isAutosaving: false,
          hasUnsavedChanges: false
        });
      }
    } catch (error) {
      console.error('Autosave failed:', error);
      setAutosaveStatus(prev => ({ 
        ...prev, 
        isAutosaving: false,
        hasUnsavedChanges: true 
      }));
    }
  }, [formData]);

  // ADD: Debounced autosave trigger
  const triggerAutosave = useCallback(() => {
    setAutosaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }));
    
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    autosaveTimerRef.current = setTimeout(() => {
      performAutosave();
    }, 3000); // Autosave after 3 seconds of inactivity
  }, [performAutosave]);

  // ENHANCED input change handler with autosave
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }));
    }
    triggerAutosave(); // ADD: Trigger autosave on form changes
  }, [errors, triggerAutosave]);

  // ENHANCED hashtag change handler with autosave
  const handleHashtagChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.map((tag, i) => i === index ? value : tag)
    }));
    triggerAutosave(); // ADD: Trigger autosave
  }, [triggerAutosave]);

  // ENHANCED featured article change handler with autosave
  const handleFeaturedChange = useCallback((value: boolean) => {
    setFormData(prev => ({ ...prev, featured_article: value }));
    triggerAutosave(); // ADD: Trigger autosave
  }, [triggerAutosave]);

  // ENHANCED summary bullet change handler with autosave
  const handleSummaryBulletChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      summary_bullets: prev.summary_bullets.map((bullet, i) => i === index ? value : bullet)
    }));
    triggerAutosave(); // ADD: Trigger autosave
  }, [triggerAutosave]);

  // ENHANCED table of contents change handler with autosave
  const handleTableOfContentsChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      table_of_contents: prev.table_of_contents.map((item, i) => i === index ? value : item)
    }));
    triggerAutosave(); // ADD: Trigger autosave
  }, [triggerAutosave]);

  // ADD: Enhanced content change handler with autosave
  const handleContentChange = useCallback((content: string) => {
    editorContentRef.current = content;
    if (errors.content) {
      setErrors(prev => ({ ...prev, content: '' }));
    }
    triggerAutosave(); // ADD: Trigger autosave on content changes
  }, [errors.content, triggerAutosave]);

  // ADD: Reference change handler with autosave
  const handleReferenceChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.map((ref, i) => i === index ? value : ref)
    }));
    triggerAutosave(); // ADD: Trigger autosave
  }, [triggerAutosave]);

  // ADD: Image upload and drag/drop handlers
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, featured_image: result }));
        triggerAutosave();
      };
      reader.readAsDataURL(file);
    }
  }, [triggerAutosave]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const removeImage = useCallback(() => {
    setImagePreview('');
    setFormData(prev => ({ ...prev, featured_image: '' }));
    triggerAutosave();
  }, [triggerAutosave]);

  // ADD: Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // ADD: Manual save shortcut (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        performAutosave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [performAutosave]);

  // Copy exact container and main styles from previous prompts
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: theme.background,
    color: theme.text,
    fontFamily: '"Sarabun", "Noto Sans Thai", "Kanit", "Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 'clamp(1rem, 4vw, 1.125rem)',
    lineHeight: '1.6',
    transition: 'all 0.3s ease'
  };

  const mainStyle: React.CSSProperties = {
    maxWidth: 'min(100%, 900px)',
    margin: '0 auto',
    padding: 'clamp(1rem, 4vw, 2rem)',
    paddingTop: 'clamp(5rem, 12vw, 6rem)',
    paddingLeft: 'clamp(4rem, 8vw, 6rem)' // ADD: Extra left padding for autosave indicator
  };

  const getButtonStyle = (variant: 'primary' | 'secondary', disabled: boolean) => ({
    padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 24px)',
    border: variant === 'secondary' ? `2px solid ${theme.border}` : 'none',
    borderRadius: 'clamp(6px, 2vw, 8px)',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Prompt", "Kanit", sans-serif',
    opacity: disabled ? 0.6 : 1,
    backgroundColor: variant === 'primary' ? theme.primary : theme.surface,
    color: variant === 'primary' ? '#ffffff' : theme.text
  });

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      published_at: '',
      author_name: '',
      category: '',
      hashtags: ['', '', '', '', ''],
      summary_bullets: ['', '', '', '', ''],
      table_of_contents: ['', '', '', '', '', '', ''],
      featured_image: '',
      references: ['', '', '', '', '', '', ''],
      featured_article: false
    });
    editorContentRef.current = '';
    setImagePreview(''); // Reset image preview
    setErrors({});
    draftIdRef.current = null;
    setAutosaveStatus({
      lastSaved: null,
      isAutosaving: false,
      hasUnsavedChanges: false
    });
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    setIsSubmitting(true);
    // Mock submit logic
    setTimeout(() => {
      setIsSubmitting(false);
      alert(`Article ${status === 'published' ? 'published' : 'saved as draft'} successfully!`);
    }, 2000);
  };

  return (
    <div style={containerStyle}>
      {/* ADD: Autosave Status Indicator */}
      <AutosaveIndicator autosaveStatus={autosaveStatus} />
      
      <main style={mainStyle}>
        <header style={{ 
          borderBottom: `2px solid ${theme.border}`, 
          paddingBottom: 'clamp(1rem, 4vw, 1.5rem)', 
          marginBottom: 'clamp(2rem, 6vw, 3rem)' 
        }}>
      <h1 style={{ 
            margin: 0, 
            fontSize: 'clamp(1.5rem, 8vw, 2.5rem)',
            fontWeight: '700',
            lineHeight: '1.2',
            color: theme.text,
            fontFamily: '"Kanit", "Sarabun", sans-serif' // ADD: Thai font priority
          }}>
            Create New Article
      </h1>
          <div style={{
            marginTop: 'clamp(0.5rem, 2vw, 0.75rem)',
            fontSize: 'clamp(0.75rem, 3vw, 0.875rem)',
            color: theme.textSecondary,
            fontFamily: '"Prompt", "Noto Sans Thai", sans-serif' // ADD: Thai font for subtitle
          }}>
            Auto-saves every 3 seconds • Press Ctrl+S to save manually
          </div>
        </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 4vw, 1.5rem)' }}>
          {/* Title */}
          <FormField label="Title" htmlFor="title" required>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter article title..."
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 16px)',
                border: `2px solid ${errors.title ? theme.error : theme.border}`,
                borderRadius: 'clamp(6px, 2vw, 8px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </FormField>

          {/* Slug */}
          <FormField label="Slug" htmlFor="slug" required>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder="article-url-slug"
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 16px)',
                border: `2px solid ${errors.slug ? theme.error : theme.border}`,
                borderRadius: 'clamp(6px, 2vw, 8px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </FormField>

          {/* Published Date */}
          <FormField label="Published Date" htmlFor="published_at">
            <input
              type="date"
              id="published_at"
              value={formData.published_at}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 16px)',
                border: `2px solid ${errors.published_at ? theme.error : theme.border}`,
                borderRadius: 'clamp(6px, 2vw, 8px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </FormField>

          {/* Author */}
          <FormField label="Author" htmlFor="author_name" required>
            <input
              type="text"
              id="author_name"
              value={formData.author_name}
              onChange={handleInputChange}
              placeholder="Author name"
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 16px)',
                border: `2px solid ${errors.author_name ? theme.error : theme.border}`,
                borderRadius: 'clamp(6px, 2vw, 8px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </FormField>

          {/* Category */}
          <FormField label="Category" htmlFor="category" required>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Article category"
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 16px)',
                border: `2px solid ${errors.category ? theme.error : theme.border}`,
                borderRadius: 'clamp(6px, 2vw, 8px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </FormField>

          {/* Hashtags */}
          <FormField label="Hashtags (5 tags)" htmlFor="hashtags">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 4vw, 20px)' }}>
              {formData.hashtags.map((tag, index) => (
                <input
                  key={index}
                  type="text"
                  value={tag}
                  onChange={(e) => handleHashtagChange(index, e.target.value)}
                  placeholder={`Hashtag ${index + 1}`}
                  style={{
                    width: '100%',
                    padding: 'clamp(18px, 5vw, 24px)',
                    border: `3px solid ${theme.border}`,
                    borderRadius: 'clamp(12px, 3vw, 16px)',
                    fontSize: 'clamp(16px, 4.5vw, 20px)',
                    fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    minHeight: 'clamp(56px, 14vw, 64px)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
              ))}
            </div>
          </FormField>

          {/* Article Summary */}
          <FormField label="Article Summary (5 bullets)" htmlFor="summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 4vw, 20px)' }}>
              {formData.summary_bullets.map((bullet, index) => (
                <input
                  key={index}
                  type="text"
                  value={bullet}
                  onChange={(e) => handleSummaryBulletChange(index, e.target.value)}
                  placeholder={`Summary point ${index + 1}`}
                  style={{
                    width: '100%',
                    padding: 'clamp(18px, 5vw, 24px)',
                    border: `3px solid ${theme.border}`,
                    borderRadius: 'clamp(12px, 3vw, 16px)',
                    fontSize: 'clamp(16px, 4.5vw, 20px)',
                    fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    minHeight: 'clamp(56px, 14vw, 64px)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
              ))}
            </div>
          </FormField>

          {/* Table of Contents */}
          <FormField label="Table of Contents (7 bullets)" htmlFor="toc">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 4vw, 20px)' }}>
              {formData.table_of_contents.map((item, index) => (
                <input
                  key={index}
                  type="text"
                  value={item}
                  onChange={(e) => handleTableOfContentsChange(index, e.target.value)}
                  placeholder={`Table of contents ${index + 1}`}
                  style={{
                    width: '100%',
                    padding: 'clamp(18px, 5vw, 24px)',
                    border: `3px solid ${theme.border}`,
                    borderRadius: 'clamp(12px, 3vw, 16px)',
                    fontSize: 'clamp(16px, 4.5vw, 20px)',
                    fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    minHeight: 'clamp(56px, 14vw, 64px)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
              ))}
            </div>
          </FormField>

          {/* Featured Image */}
          <FormField label="Featured Image" htmlFor="featured_image">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 3vw, 16px)' }}>
              {/* Drag and Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  width: '100%',
                  minHeight: imagePreview ? 'auto' : 'clamp(160px, 25vw, 200px)',
                  border: `3px dashed ${isDragging ? theme.primary : (errors.featured_image ? theme.error : theme.border)}`,
                  borderRadius: 'clamp(16px, 4vw, 20px)',
                  backgroundColor: isDragging ? `${theme.primary}10` : theme.surface,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'clamp(24px, 6vw, 32px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {imagePreview ? (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <img
                      src={imagePreview}
                      alt="Featured image preview"
                      style={{
                        width: '100%',
                        maxHeight: 'clamp(200px, 30vw, 300px)',
                        objectFit: 'cover',
                        borderRadius: 'clamp(6px, 2vw, 8px)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      style={{
                        position: 'absolute',
                        top: 'clamp(12px, 3vw, 16px)',
                        right: 'clamp(12px, 3vw, 16px)',
                        backgroundColor: theme.error,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 'clamp(44px, 10vw, 52px)',
                        height: 'clamp(44px, 10vw, 52px)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'clamp(18px, 5vw, 24px)',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: 'clamp(24px, 6vw, 32px)',
                      color: isDragging ? theme.primary : theme.textSecondary,
                      marginBottom: 'clamp(8px, 2vw, 12px)'
                    }}>
                      📷
                    </div>
                    <div style={{
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                      fontWeight: '600',
                      color: isDragging ? theme.primary : theme.text,
                      marginBottom: 'clamp(4px, 1vw, 6px)',
                      textAlign: 'center',
                      fontFamily: '"Prompt", "Kanit", sans-serif'
                    }}>
                      {isDragging ? 'Drop image here' : 'Drag & drop image here'}
                    </div>
                    <div style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      color: theme.textSecondary,
                      textAlign: 'center',
                      fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif'
                    }}>
                      or click to browse files
                    </div>
                  </>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              {/* URL Input Alternative */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)' }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: theme.border
                }} />
                <span style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: theme.textSecondary,
                  fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                  padding: '0 clamp(8px, 2vw, 12px)'
                }}>
                  or paste URL
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: theme.border
                }} />
              </div>

              <input
                type="url"
                id="featured_image"
                value={formData.featured_image.startsWith('data:') ? '' : formData.featured_image}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, featured_image: value }));
                  setImagePreview(value);
                  if (errors.featured_image) {
                    setErrors(prev => ({ ...prev, featured_image: '' }));
                  }
                  triggerAutosave();
                }}
                placeholder="https://example.com/image.jpg"
                style={{
                  width: '100%',
                  padding: 'clamp(18px, 5vw, 24px)',
                  border: `3px solid ${errors.featured_image ? theme.error : theme.border}`,
                  borderRadius: 'clamp(12px, 3vw, 16px)',
                  fontSize: 'clamp(16px, 4.5vw, 20px)',
                  fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  minHeight: 'clamp(56px, 14vw, 64px)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              />
            </div>
          </FormField>
          
          {/* Article Content */}
          <FormField label="Article Content" htmlFor="content" required>
            <RichTextEditor
              content={editorContentRef.current}
              onChange={handleContentChange}
              theme={theme}
              hasError={!!errors.content}
            />
            {errors.content && (
              <div style={{ 
                color: theme.error, 
                fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', 
                marginTop: 'clamp(6px, 2vw, 8px)',
                lineHeight: '1.4'
              }}>
                {errors.content}
              </div>
            )}
          </FormField>

          {/* References */}
          <FormField label="References (7 bullets)" htmlFor="references">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 4vw, 20px)' }}>
              {formData.references.map((ref, index) => (
                <input
                  key={index}
                  type="text"
                  value={ref}
                  onChange={(e) => handleReferenceChange(index, e.target.value)}
                  placeholder={`Reference ${index + 1}`}
                  style={{
                    width: '100%',
                    padding: 'clamp(18px, 5vw, 24px)',
                    border: `3px solid ${theme.border}`,
                    borderRadius: 'clamp(12px, 3vw, 16px)',
                    fontSize: 'clamp(16px, 4.5vw, 20px)',
                    fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    minHeight: 'clamp(56px, 14vw, 64px)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
              ))}
            </div>
          </FormField>
      </div>
      
        <footer style={{
          marginTop: 'clamp(3rem, 8vw, 4rem)',
          paddingTop: 'clamp(2rem, 6vw, 3rem)',
          borderTop: `2px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(1.5rem, 5vw, 2rem)'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 'clamp(1.5rem, 5vw, 2rem)'
          }}>
            {/* ADD: Manual autosave button */}
        <button 
              type="button"
              onClick={performAutosave}
              disabled={autosaveStatus.isAutosaving}
          style={{ 
                ...getButtonStyle('secondary', autosaveStatus.isAutosaving),
                backgroundColor: autosaveStatus.hasUnsavedChanges ? theme.warning : theme.surface,
                color: autosaveStatus.hasUnsavedChanges ? '#ffffff' : theme.text
              }}
            >
              {autosaveStatus.isAutosaving && <LoadingSpinner variant="autosave" />}
              {autosaveStatus.hasUnsavedChanges ? 'Save Changes Now' : 'Save Draft Manually'}
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              style={getButtonStyle('secondary', isSubmitting)}
            >
              Reset Form
        </button>
      
      <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 'clamp(1rem, 4vw, 1.5rem)'
            }}>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                style={getButtonStyle('secondary', isSubmitting)}
              >
                {isSubmitting && <LoadingSpinner />}
                Save Draft
              </button>
              
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={isSubmitting}
                style={getButtonStyle('primary', isSubmitting)}
              >
                {isSubmitting && <LoadingSpinner />}
                Publish Article
              </button>
            </div>
      </div>
        </footer>
    </main>
    </div>
  );
}
