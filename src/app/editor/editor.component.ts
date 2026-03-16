import { Component, ElementRef, OnInit, ViewChild, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorView } from '@codemirror/view';
import {
  EditorBlock,
  CodeMirrorCallbacks,
  addBlockEffect,
  updateBlockEffect, 
  createEditorState,
  getEditorData
} from './editor-core';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditorComponent implements OnInit, OnDestroy, CodeMirrorCallbacks {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef;
  private view!: EditorView;

  // 弹窗状态
  showPopup = false;
  popupStyle = { top: '0px', left: '0px' };
  editingBlock: EditorBlock = { id: '', placeholder: '', presetText: '' };
  allBlocks: Map<string, EditorBlock> = new Map();

  ngOnInit() {
    const initialState = createEditorState('# 角色\n\n你是一个 ', this);
    
    this.view = new EditorView({
      state: initialState,
      parent: this.editorHost.nativeElement
    });
  }

  updateBlockText(id: string, text: string) {
    const block = this.allBlocks.get(id);
    if (block) {
      block.presetText = text;
      this.allBlocks.set(id, block);
      // 同步到当前编辑中的块
      if (this.showPopup && this.editingBlock.id === id) {
        this.editingBlock.presetText = text;
      }
    }
  }

  openPopup(id: string, rect: DOMRect) {
    const block = this.allBlocks.get(id);
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

  addBlock() {
    const newBlock: EditorBlock = {
      id: Math.random().toString(36).substr(2, 9),
      placeholder: '请输入编辑块内容为空时的提示文案',
      presetText: ''
    };
    this.allBlocks.set(newBlock.id, newBlock);
    this.view.dispatch({
      effects: addBlockEffect.of(newBlock)
    });
    this.view.focus();
  }

  saveBlock() {
    if (this.editingBlock.id) {
      // 深度同步到全局 Map
      const updatedBlock = { ...this.editingBlock };
      this.allBlocks.set(updatedBlock.id, updatedBlock);
      
      // 通过 dispatch 触发装饰器重新创建，从而刷新 input 的 placeholder 和内容
      this.view.dispatch({
        effects: updateBlockEffect.of(updatedBlock)
      });
      
      this.closePopup();
    }
  }

  closePopup() {
    this.showPopup = false;
  }

  onConfirm() {
    const data = getEditorData(this.view, this.allBlocks);
    console.log('--- Editor Data (JSON) ---');
    console.log(JSON.stringify(data.json, null, 2));
    console.log('--- Editor Data (HTML) ---');
    console.log(data.html);
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.destroy();
    }
  }
}
