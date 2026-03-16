import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

// 模拟 Coze 的块数据结构
export interface EditorBlock {
  id: string;
  placeholder: string; // 空白引导
  presetText: string;  // 预设文本
}

export interface CodeMirrorCallbacks {
  updateBlockText: (id: string, text: string) => void;
  openPopup: (id: string, rect: DOMRect) => void;
}

// 定义用于在文档中添加和删除块的状态效果
export const addBlockEffect = StateEffect.define<EditorBlock>();
export const updateBlockEffect = StateEffect.define<EditorBlock>();
export const deleteBlockEffect = StateEffect.define<string>();

// 自定义 Widget
class BlockWidget extends WidgetType {
  constructor(public block: EditorBlock, private callbacks: CodeMirrorCallbacks) {
    super();
  }

  override toDOM(view: EditorView) {
    const span = document.createElement('span');
    span.className = 'cm-inline-block';
    span.setAttribute('data-block-id', this.block.id);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'block-input';
    input.value = this.block.presetText || '';
    input.placeholder = this.block.placeholder || '请输入...';
    
    // 设置 input 宽度自适应
    const measureWidth = (val: string) => {
      const temp = document.createElement('span');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.whiteSpace = 'pre';
      temp.style.font = 'inherit';
      temp.textContent = val || input.placeholder;
      document.body.appendChild(temp);
      const width = temp.offsetWidth;
      document.body.removeChild(temp);
      return width + 10;
    };
    
    input.style.width = `${measureWidth(input.value)}px`;

    input.oninput = (e) => {
      const val = (e.target as HTMLInputElement).value;
      input.style.width = `${measureWidth(val)}px`;
      this.callbacks.updateBlockText(this.block.id, val);
    };

    // 重点：当 input 获焦或点击时，触发弹窗展示
    input.onfocus = (e) => {
      const rect = span.getBoundingClientRect();
      this.callbacks.openPopup(this.block.id, rect);
    };

    input.onmousedown = (e) => {
      e.stopPropagation();
    };

    input.onclick = (e) => {
      e.stopPropagation();
      const rect = span.getBoundingClientRect();
      this.callbacks.openPopup(this.block.id, rect);
    };

    span.appendChild(input);
    return span;
  }

  override ignoreEvent(event: Event) {
    // 返回 true 表示让浏览器处理这些事件（例如 input 的打字、点击、获焦等）
    // 这样 input 元素本身就能正常工作，而不会被 CodeMirror 拦截
    return true;
  }
}

// 状态字段：管理文档中的所有块装饰器
export const createBlockField = (callbacks: CodeMirrorCallbacks) => StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    
    for (let e of tr.effects) {
      if (e.is(addBlockEffect)) {
        const pos = tr.state.selection.main.head;
        const blockDecoration = Decoration.widget({
          widget: new BlockWidget(e.value, callbacks),
          side: 0
        }).range(pos);
        decorations = decorations.update({ add: [blockDecoration] });
      } else if (e.is(updateBlockEffect)) {
        const newBlock = e.value;
        let pos: number | null = null;
        decorations.between(0, tr.state.doc.length, (from, to, value) => {
          const widget = value.spec.widget;
          if (widget instanceof BlockWidget && widget.block.id === newBlock.id) {
            pos = from;
          }
        });
        
        if (pos !== null) {
          decorations = decorations.update({
            filter: (from, to, value) => {
              const widget = value.spec.widget;
              return !(widget instanceof BlockWidget && widget.block.id === newBlock.id);
            },
            add: [Decoration.widget({
              widget: new BlockWidget(newBlock, callbacks),
              side: 0
            }).range(pos)]
          });
        }
      } else if (e.is(deleteBlockEffect)) {
        const blockId = e.value;
        decorations = decorations.update({
          filter: (from, to, value) => {
            const widget = value.spec.widget;
            return !(widget instanceof BlockWidget && widget.block.id === blockId);
          }
        });
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

export const editorTheme = EditorView.theme({
  '&': { height: '100%', outline: 'none' },
  '.cm-content': { padding: '20px', fontSize: '16px' },
  '.cm-line': { padding: '4px 0' },
  '.cm-inline-block': {
    display: 'inline-block',
    backgroundColor: '#f3f0ff',
    color: '#8066ff',
    padding: '0 8px',
    margin: '0 4px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.2s',
    fontSize: '15px',
    verticalAlign: 'middle'
  },
  '.cm-inline-block:hover': {
    backgroundColor: '#e9e4ff',
    borderColor: '#8066ff'
  },
  '.block-input': {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'inherit',
    font: 'inherit',
    padding: '4px 0',
    width: 'auto',
    minWidth: '20px',
    textAlign: 'center'
  },
  '.block-input::placeholder': {
    color: '#b2a1ff',
    opacity: 0.7
  },
  '.cm-header-1': { fontSize: '1.5em', color: '#008c99', fontWeight: 'bold' }
});

export function createEditorState(initialDoc: string, callbacks: CodeMirrorCallbacks) {
  return EditorState.create({
    doc: initialDoc,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      createBlockField(callbacks),
      editorTheme
    ]
  });
}

export function createEditorView(parent: HTMLElement, state: EditorState) {
  return new EditorView({
    state,
    parent
  });
}
