/**
 * Professional TipTap email editor — full toolbar, links, tables, images, formatting.
 */
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { plainTextToHtml } from '../../utils/htmlEmailBody';
import LinkInsertDialog from './dialogs/LinkInsertDialog';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconCode,
  IconDivider,
  IconImage,
  IconItalic,
  IconLink,
  IconListBullet,
  IconListNumber,
  IconQuote,
  IconRedo,
  IconStrike,
  IconTable,
  IconUnderline,
  IconUndo,
} from './emailEditorIcons';

export interface TiptapEmailEditorHandle {
  insertContent: (content: string) => void;
  insertHtml: (html: string) => void;
  focus: () => void;
}

interface TiptapEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
  compactToolbar?: boolean;
  ariaLabel?: string;
  onRequestLink?: () => void;
  onRequestImage?: () => void;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Segoe UI, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

const TEXT_COLORS = [
  '#1e293b',
  '#3d5466',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
];

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#e7e5e4',
];

function ToolbarDivider() {
  return <span className="email-toolbar-divider" aria-hidden />;
}

function ToolbarBtn({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`email-toolbar-btn ${active ? 'email-toolbar-btn--active' : ''}`}
    >
      {children}
    </button>
  );
}

const TiptapEmailEditor = forwardRef<TiptapEmailEditorHandle, TiptapEmailEditorProps>(
  function TiptapEmailEditor(
    {
      value,
      onChange,
      disabled = false,
      placeholder = 'Compose your message…',
      minHeightClassName = 'min-h-[280px]',
      compactToolbar = false,
      ariaLabel = 'Email body',
    },
    ref,
  ) {
    const lastExternalValue = useRef(value);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkSelectionText, setLinkSelectionText] = useState('');
    const imageInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
        }),
        Underline,
        Subscript,
        Superscript,
        TextStyle,
        Color,
        FontFamily,
        Highlight.configure({ multicolor: true }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        }),
        Image.configure({ inline: true, allowBase64: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder }),
      ],
      content: plainTextToHtml(value),
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        lastExternalValue.current = html;
        onChange(html);
      },
      editorProps: {
        attributes: {
          class: `email-tiptap-content ${minHeightClassName}`,
          'aria-label': ariaLabel,
        },
      },
    });

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [editor, disabled]);

    useEffect(() => {
      if (!editor || value === lastExternalValue.current) return;
      const html = plainTextToHtml(value);
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
      lastExternalValue.current = html;
    }, [editor, value]);

    useImperativeHandle(
      ref,
      () => ({
        insertContent: (content: string) => {
          editor?.chain().focus().insertContent(content).run();
        },
        insertHtml: (html: string) => {
          editor?.chain().focus().insertContent(html).run();
        },
        focus: () => {
          editor?.chain().focus().run();
        },
      }),
      [editor],
    );

    const openLinkDialog = () => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const selected = editor.state.doc.textBetween(from, to, ' ');
      setLinkSelectionText(selected);
      setLinkDialogOpen(true);
    };

    const handleImageFile = (file: File) => {
      if (!editor || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
    };

    if (!editor) {
      return (
        <div className="email-composer-shell animate-pulse rounded-xl border border-crm-taupe/20 bg-crm-white p-8 text-sm text-crm-slate">
          Loading editor…
        </div>
      );
    }

    return (
      <div className="email-composer-shell overflow-hidden rounded-xl border border-crm-taupe/20 bg-crm-white shadow-sm">
        {!disabled && (
          <div className={`email-toolbar ${compactToolbar ? 'email-toolbar--compact' : ''}`}>
            <div className="email-toolbar-group">
              <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                <IconUndo />
              </ToolbarBtn>
              <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                <IconRedo />
              </ToolbarBtn>
            </div>

            <ToolbarDivider />

            <div className="email-toolbar-group">
              <select
                aria-label="Block style"
                className="email-toolbar-select"
                value={
                  editor.isActive('heading', { level: 1 })
                    ? 'h1'
                    : editor.isActive('heading', { level: 2 })
                      ? 'h2'
                      : editor.isActive('heading', { level: 3 })
                        ? 'h3'
                        : 'p'
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'p') editor.chain().focus().setParagraph().run();
                  else editor.chain().focus().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
                }}
              >
                <option value="p">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>

              <select
                aria-label="Font family"
                className="email-toolbar-select"
                onChange={(e) => {
                  if (e.target.value) {
                    editor.chain().focus().setFontFamily(e.target.value).run();
                  }
                }}
              >
                <option value="">Font</option>
                {FONT_FAMILIES.map((font) => (
                  <option key={font.label} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <ToolbarDivider />

            <div className="email-toolbar-group">
              <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                <IconBold />
              </ToolbarBtn>
              <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <IconItalic />
              </ToolbarBtn>
              <ToolbarBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <IconUnderline />
              </ToolbarBtn>
              <ToolbarBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                <IconStrike />
              </ToolbarBtn>
              <ToolbarBtn title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
                <IconCode />
              </ToolbarBtn>
              <ToolbarBtn title="Superscript" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
                x²
              </ToolbarBtn>
              <ToolbarBtn title="Subscript" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()}>
                x₂
              </ToolbarBtn>
            </div>

            <ToolbarDivider />

            <div className="email-toolbar-group email-toolbar-colors">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={`Text color ${color}`}
                  style={{ backgroundColor: color }}
                  className="email-color-swatch"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                />
              ))}
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={`hl-${color}`}
                  type="button"
                  title={`Highlight ${color}`}
                  style={{ backgroundColor: color }}
                  className="email-color-swatch email-color-swatch--highlight"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                />
              ))}
            </div>

            <ToolbarDivider />

            <div className="email-toolbar-group">
              <ToolbarBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                <IconAlignLeft />
              </ToolbarBtn>
              <ToolbarBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                <IconAlignCenter />
              </ToolbarBtn>
              <ToolbarBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                <IconAlignRight />
              </ToolbarBtn>
            </div>

            <ToolbarDivider />

            <div className="email-toolbar-group">
              <ToolbarBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <IconListBullet />
              </ToolbarBtn>
              <ToolbarBtn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <IconListNumber />
              </ToolbarBtn>
              <ToolbarBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <IconQuote />
              </ToolbarBtn>
              <ToolbarBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <IconDivider />
              </ToolbarBtn>
            </div>

            <ToolbarDivider />

            <div className="email-toolbar-group">
              <ToolbarBtn title="Insert link" active={editor.isActive('link')} onClick={openLinkDialog}>
                <IconLink />
              </ToolbarBtn>
              <ToolbarBtn title="Insert image" onClick={() => imageInputRef.current?.click()}>
                <IconImage />
              </ToolbarBtn>
              <ToolbarBtn
                title="Insert table"
                onClick={() =>
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                }
              >
                <IconTable />
              </ToolbarBtn>
              {editor.isActive('table') && (
                <>
                  <ToolbarBtn title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                    +Col
                  </ToolbarBtn>
                  <ToolbarBtn title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
                    +Row
                  </ToolbarBtn>
                  <ToolbarBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
                    ×Tbl
                  </ToolbarBtn>
                </>
              )}
            </div>
          </div>
        )}

        <EditorContent editor={editor} />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
            e.target.value = '';
          }}
        />

        <LinkInsertDialog
          open={linkDialogOpen}
          initialText={linkSelectionText}
          onClose={() => setLinkDialogOpen(false)}
          onConfirm={(url, text, openInNewTab) => {
            const label = text || url;
            const target = openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
            if (editor.state.selection.empty) {
              editor.chain().focus().insertContent(`<a href="${url}"${target}>${label}</a>`).run();
            } else {
              editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: url, target: openInNewTab ? '_blank' : null })
                .run();
            }
          }}
        />
      </div>
    );
  },
);

export default TiptapEmailEditor;
