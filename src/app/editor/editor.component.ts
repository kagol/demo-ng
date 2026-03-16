import { Component, ElementRef, OnInit, ViewChild, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorView } from '@codemirror/view';
import {
  EditorBlock,
  CustomEditor,
  CustomEditorOptions
} from './editor-core';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef;
  private editor!: CustomEditor;

  // 弹窗状态
  showPopup = false;
  popupStyle = { top: '0px', left: '0px' };
  editingBlock: EditorBlock = { id: '', placeholder: '', presetText: '' };

  // 插件弹窗状态
  showPluginPopup = false;
  pluginPopupStyle = { top: '0px', left: '0px' };
  plugins = [
    { id: 'plugin-1', name: 'LinkReaderPlugin', type: 'plugin' as const },
  ];
  workflows = [
    { id: 'workflow-1', name: 'condition_1_872', type: 'workflow' as const },
  ];
  private pluginTriggerPos: number = 0;

  // AI 对话框状态
  showAIDialog = false;
  aiDialogStyle = { top: '0px', left: '0px' };
  aiQuestion = '';
  aiResponseText = '';
  isGenerating = false;
  aiLoading = false;
  private aiTriggerPos: number = 0;
  private aiStreamTimer: any = null;

  ngOnInit() {
    const initialBlocks = [
      {
        pos: 11,
        block: {
          id: 'init-block-1',
          placeholder: '请输入...',
          presetText: '智能助手'
        }
      }
    ];

    const options: CustomEditorOptions = {
      parent: this.editorHost.nativeElement,
      initialDoc: '# 角色\n\n你是一个  ',
      initialBlocks,
      onOpenPopup: (id, rect) => this.openPopup(id, rect),
      onTriggerPluginPopup: (pos) => this.openPluginPopup(pos),
      onTriggerAIDialog: (pos) => this.openAIDialog(pos),
      onBlockUpdated: (id, text) => {
        if (this.showPopup && this.editingBlock.id === id) {
          this.editingBlock.presetText = text;
        }
      }
    };

    this.editor = new CustomEditor(options);
  }

  openPopup(id: string, rect: DOMRect) {
    const block = this.editor.getBlock(id);
    if (block) {
      this.editingBlock = { ...block };
      this.showPopup = true;
      // 计算弹窗位置（简单逻辑：在 block 下方）
      const editorRect = this.editorHost.nativeElement.getBoundingClientRect();
      this.popupStyle = {
        top: `${rect.bottom - editorRect.top + 10}px`,
        left: `${rect.left - editorRect.left}px`
      };
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    if (this.showPopup || this.showPluginPopup || (this.showAIDialog && !this.isGenerating)) {
      this.closePopup();
    }
  }

  openAIDialog(pos: number) {
    this.aiTriggerPos = pos;
    const coords = this.editor.view.coordsAtPos(pos);
    if (coords) {
      const editorRect = this.editorHost.nativeElement.getBoundingClientRect();
      this.aiDialogStyle = {
        top: `${coords.bottom - editorRect.top + 10}px`,
        left: `${coords.left - editorRect.left}px`
      };
      this.aiQuestion = '';
      this.aiResponseText = '';
      this.showAIDialog = true;
    }
  }

  sendAIQuestion() {
    if (!this.aiQuestion || this.isGenerating) return;

    this.isGenerating = true;
    this.aiLoading = true;
    this.aiResponseText = '';

    // 模拟 AI 流式输出
    const fullResponse = `洲、美洲积累了丰富的在地经验，擅长结合用户需求定制专属旅行方案，曾帮助1000+人解决旅行难题，被旅行者亲切称为"旅行百事通"。\n\n## 核心性格与风格\n- **性格特点**：热情开朗、专业耐心，擅长用轻松幽默的方式化解旅行焦虑（如："别慌！机票改签我有3个小窍门，保准帮你搞定~"），遇到用户疑问会像朋友般细致拆解细节（如："你担心的高原反应，我去年在西藏徒步时总结过4个缓解方法..."）。\n- **语言风格**：口语化且富有感染力，常用"宝藏地""小众玩法"等旅行圈`;
    
    let index = 0;
    this.aiStreamTimer = setInterval(() => {
      this.aiLoading = false;
      if (index < fullResponse.length) {
        this.aiResponseText += fullResponse[index];
        index++;
      } else {
        this.stopAIResponse();
      }
    }, 30);
  }

  stopAIResponse() {
    if (this.aiStreamTimer) {
      clearInterval(this.aiStreamTimer);
      this.aiStreamTimer = null;
    }
    this.isGenerating = false;
    this.aiLoading = false;
  }

  openPluginPopup(pos: number) {
    this.pluginTriggerPos = pos;
    const coords = this.editor.view.coordsAtPos(pos);
    if (coords) {
      const editorRect = this.editorHost.nativeElement.getBoundingClientRect();
      this.pluginPopupStyle = {
        top: `${coords.bottom - editorRect.top + 10}px`,
        left: `${coords.left - editorRect.left}px`
      };
      this.showPluginPopup = true;
    }
  }

  addPluginBlock(item: { id: string, name: string, type: 'plugin' | 'workflow' }) {
    this.editor.addPluginBlock(this.pluginTriggerPos, item);
    this.closePopup();
  }

  addBlock() {
    this.editor.addBlock();
  }

  syncBlock() {
    if (this.editingBlock.id) {
      this.editor.syncBlock(this.editingBlock);
    }
  }

  closePopup() {
    this.showPopup = false;
    this.showPluginPopup = false;
    this.showAIDialog = false;
    this.stopAIResponse();
  }

  onConfirm() {
    const data = this.editor.getData();
    console.log('--- Editor Data (JSON) ---');
    console.log(JSON.stringify(data.json, null, 2));
    console.log('--- Editor Data (HTML) ---');
    console.log(data.html);
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  }
}
