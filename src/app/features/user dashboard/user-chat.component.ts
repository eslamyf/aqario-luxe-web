import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserDashboardService } from './user-dashboard.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService, User } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-user-chat',
  template: `
    <div class="chat-wrapper" [class.rtl]="isRtl">
      <div class="page-header">
        <div class="section-eyebrow">{{ 'CHAT.TITLE' | translate }}</div>
        <h1>{{ 'CHAT.TITLE' | translate }}</h1>
      </div>

      <div class="chat-container">
        <!-- Sidebar Panel (Conversations List) -->
        <div class="chat-sidebar" [class.hidden-mobile]="selectedChat">
          <div class="sidebar-header">
            <input 
              type="text" 
              [placeholder]="'COMMON.SEARCH' | translate" 
              [(ngModel)]="searchQuery" 
              (input)="filterChats()" 
            />
          </div>

          <div class="chats-list">
            <div *ngIf="loadingChats" class="loading-chats">
              <div class="skeleton-chat" *ngFor="let i of [1,2,3,4]"></div>
            </div>

            <div *ngIf="!loadingChats && filteredChats.length === 0" class="empty-chats">
              <i class="fa-solid fa-comments" aria-hidden="true"></i>
              <p>{{ 'CHAT.NO_CHATS' | translate }}</p>
              <span class="subtext">{{ 'CHAT.NO_CHATS_SUB' | translate }}</span>
            </div>

            <div 
              *ngFor="let chat of filteredChats" 
              class="chat-item-card" 
              [class.active]="selectedChat?._id === chat._id"
              (click)="selectChat(chat)"
            >
              <div class="participant-avatar">
                <img *ngIf="getParticipant(chat)?.photo" [src]="getParticipant(chat)?.photo" [alt]="getParticipant(chat)?.name" />
                <span *ngIf="!getParticipant(chat)?.photo">{{ getParticipant(chat)?.name?.charAt(0) | uppercase }}</span>
                <span class="status-indicator" [class.online]="isParticipantOnline(getParticipant(chat)?._id)"></span>
              </div>
              <div class="chat-item-info">
                <div class="chat-item-meta">
                  <span class="participant-name">{{ getParticipant(chat)?.name }}</span>
                  <span class="message-time" *ngIf="chat.lastMessage">{{ chat.lastMessage.createdAt | date:'shortTime' }}</span>
                </div>
                <div class="chat-item-preview">
                  <p class="preview-text" *ngIf="chat.lastMessage">
                    <span *ngIf="chat.lastMessage.sender?._id === currentUser?._id || chat.lastMessage.sender === currentUser?._id">{{ 'REAL_ESTATE.OWNER' | translate }}: </span>
                    {{ getPreviewSnippet(chat.lastMessage) }}
                  </p>
                  <p class="preview-text placeholder" *ngIf="!chat.lastMessage">{{ 'CHAT.NO_CHATS' | translate }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Viewport (Active Room Feed) -->
        <div class="chat-viewport" [class.hidden-mobile]="!selectedChat">
          <!-- Selection Splash -->
          <div class="no-selection-splash" *ngIf="!selectedChat">
            <div class="splash-icon-box">
              <i class="fa-solid fa-message" aria-hidden="true"></i>
            </div>
            <h2>{{ 'CHAT.TITLE' | translate }}</h2>
            <p>{{ 'CHAT.SELECT_CONVERSATION' | translate }}</p>
          </div>

          <!-- Active Conversation -->
          <div class="active-chat" *ngIf="selectedChat">
            <!-- Header -->
            <div class="chat-header">
              <button class="back-btn" (click)="closeChat()">
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
              </button>
              <div class="header-avatar">
                <img *ngIf="getParticipant(selectedChat)?.photo" [src]="getParticipant(selectedChat)?.photo" [alt]="getParticipant(selectedChat)?.name" />
                <span *ngIf="!getParticipant(selectedChat)?.photo">{{ getParticipant(selectedChat)?.name?.charAt(0) | uppercase }}</span>
              </div>
              <div class="header-meta">
                <span class="header-name">{{ getParticipant(selectedChat)?.name }}</span>
              </div>
              <a class="back-to-inquiries" (click)="navigateToInquiries()">
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                <span>{{ 'CHAT.BACK_TO_INQUIRIES' | translate }}</span>
              </a>
            </div>

            <!-- Messages Log -->
            <div class="messages-log" #scrollPane>
              <div *ngIf="loadingMessages" class="loading-messages">
                <span class="spinner"></span>
              </div>

              <div *ngIf="!loadingMessages && messages.length === 0" class="empty-messages-log">
                <p>{{ 'CHAT.NO_CHATS' | translate }}</p>
              </div>

              <div 
                *ngFor="let msg of messages; let idx = index" 
                class="message-bubble-row"
                [class.sent]="isSentByMe(msg)"
                [class.received]="!isSentByMe(msg)"
              >
                <!-- Avatar for received -->
                <div class="msg-avatar" *ngIf="!isSentByMe(msg)">
                  <img *ngIf="msg.sender?.photo" [src]="msg.sender.photo" [alt]="msg.sender.name" />
                  <span *ngIf="!msg.sender?.photo">{{ msg.sender?.name?.charAt(0) | uppercase }}</span>
                </div>

                <div class="msg-bubble-content">
                  <div class="bubble">
                    <!-- Text Message Type -->
                    <p class="bubble-text" *ngIf="msg.messageType === 'text'">{{ msg.text }}</p>

                    <!-- Image Attachment Type -->
                    <div class="bubble-image-box" *ngIf="msg.messageType === 'image'">
                      <img [src]="msg.fileUrl" (click)="openLightbox(msg.fileUrl)" alt="Attached Image" />
                    </div>

                    <!-- Video Attachment Type -->
                    <div class="bubble-video-box" *ngIf="msg.messageType === 'video'">
                      <video [src]="msg.fileUrl" controls preload="metadata"></video>
                    </div>

                    <!-- Audio/Voice Note Type -->
                    <div class="bubble-audio-box" *ngIf="msg.messageType === 'audio'">
                      <div class="audio-note-label">
                        <i class="fa-solid fa-microphone" aria-hidden="true"></i>
                        <span>{{ 'CHAT.VOICE_NOTE' | translate }}</span>
                      </div>
                      <audio [src]="msg.fileUrl" controls preload="auto"></audio>
                    </div>

                    <!-- PDF/Word Attachment Type -->
                    <div class="bubble-file-card" *ngIf="msg.messageType === 'file'">
                      <div class="file-card-info">
                        <i class="fa-solid fa-file-pdf" *ngIf="msg.text.endsWith('.pdf')" aria-hidden="true"></i>
                        <i class="fa-solid fa-file-word" *ngIf="!msg.text.endsWith('.pdf')" aria-hidden="true"></i>
                        <div class="file-meta">
                          <span class="file-name">{{ msg.text }}</span>
                          <span class="file-type">{{ 'CHAT.ATTACHMENT' | translate }}</span>
                        </div>
                      </div>
                      <a [href]="msg.fileUrl" target="_blank" download class="file-download-btn">
                        <i class="fa-solid fa-download" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <span class="msg-timestamp">{{ msg.createdAt | date:'shortTime' }}</span>
                </div>
              </div>
            </div>

            <!-- Input Panel / Media Bar -->
            <div class="input-panel">
              <!-- Inline Recorder Tray -->
              <div class="recorder-overlay" *ngIf="isRecording">
                <div class="recording-pulse"></div>
                <span class="recording-timer">{{ recordDuration | date:'mm:ss' }}</span>
                <canvas #visualizer class="waveform-canvas"></canvas>
                <div class="recorder-actions">
                  <button class="action-btn cancel-record" (click)="cancelRecord()">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                  <button class="action-btn stop-record" (click)="stopRecord()">
                    <i class="fa-solid fa-check" aria-hidden="true"></i>
                  </button>
                </div>
              </div>

              <!-- Main Input Field -->
              <div class="input-actions-bar" *ngIf="!isRecording">
                <!-- Media Uploader (Camera Button) -->
                <button class="input-icon-btn" (click)="triggerMediaPicker()">
                  <i class="fa-solid fa-camera" aria-hidden="true"></i>
                </button>
                <input 
                  type="file" 
                  #mediaPicker 
                  (change)="onMediaSelected($event)" 
                  accept="image/png, image/jpeg, image/jpg, video/mp4" 
                  style="display: none;" 
                />

                <!-- File Picker (Paperclip Button) -->
                <button class="input-icon-btn" (click)="triggerFilePicker()">
                  <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
                </button>
                <input 
                  type="file" 
                  #filePicker 
                  (change)="onFileSelected($event)" 
                  accept=".pdf, .docx, .doc" 
                  style="display: none;" 
                />

                <!-- Text Area Input -->
                <textarea 
                  [placeholder]="'CHAT.TYPE_MESSAGE' | translate" 
                  [(ngModel)]="newMessageText"
                  (keydown.enter)="onEnterPressed($event)"
                  rows="1"
                ></textarea>

                <!-- Audio Recorder Trigger (Microphone Button) -->
                <button class="input-icon-btn microphone-trigger" (click)="startRecord()">
                  <i class="fa-solid fa-microphone" aria-hidden="true"></i>
                </button>

                <!-- Send Button -->
                <button class="send-message-btn" [class.active]="newMessageText.trim().length > 0 || uploadingAttachment" [disabled]="!newMessageText.trim() && !uploadingAttachment" (click)="sendTextMessage()">
                  <span *ngIf="uploadingAttachment" class="spinner-xs"></span>
                  <i *ngIf="!uploadingAttachment" class="fa-solid fa-paper-plane" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Lightbox Overlay -->
      <div class="lightbox-overlay" *ngIf="lightboxUrl" (click)="closeLightbox()">
        <div class="lightbox-content" (click)="$event.stopPropagation()">
          <img [src]="lightboxUrl" alt="Large View" />
          <button class="close-lightbox" (click)="closeLightbox()">&times;</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper {
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 800px;
    }
    .page-header {
      margin-bottom: 1.5rem;
    }
    .section-eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--brand-gold);
      margin-bottom: 0.5rem;
    }
    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      letter-spacing: -0.02em;
    }

    /* main chat window structure */
    .chat-container {
      display: flex;
      flex: 1;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(10px);
    }

    /* Sidebar (Chat List) */
    .chat-sidebar {
      width: 320px;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      background: color-mix(in srgb, var(--bg-surface) 50%, transparent);
    }
    .sidebar-header {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border-color);
    }
    .sidebar-header input {
      width: 100%;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-deep);
      color: var(--text-main);
      font-size: 0.9rem;
      box-sizing: border-box;
    }
    .sidebar-header input:focus {
      outline: none;
      border-color: var(--brand-gold);
    }

    .chats-list {
      flex: 1;
      overflow-y: auto;
    }
    .loading-chats {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .skeleton-chat {
      height: 70px;
      border-radius: 12px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--text-main) 4%, transparent) 25%, color-mix(in srgb, var(--text-main) 8%, transparent) 50%, color-mix(in srgb, var(--text-main) 4%, transparent) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .empty-chats {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--text-muted);
    }
    .empty-chats i {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      color: var(--brand-gold);
    }
    .empty-chats p {
      font-weight: 600;
      margin: 0 0 0.25rem;
      color: var(--text-main);
    }
    .empty-chats .subtext {
      font-size: 0.8rem;
    }

    .chat-item-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: all 0.2s;
    }
    .chat-item-card:hover {
      background: color-mix(in srgb, var(--text-main) 3%, transparent);
    }
    .chat-item-card.active {
      background: color-mix(in srgb, var(--brand-gold) 8%, transparent);
      border-left: 3px solid var(--brand-gold);
    }

    .participant-avatar {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--bg-deep);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: var(--text-main);
      overflow: visible;
      flex-shrink: 0;
      border: 1px solid var(--border-color);
    }
    .participant-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .status-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #94a3b8;
      border: 2px solid var(--bg-surface);
    }
    .status-indicator.online {
      background: #10b981;
    }

    .chat-item-info {
      flex: 1;
      min-width: 0;
    }
    .chat-item-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.25rem;
    }
    .participant-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .message-time {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .chat-item-preview {
      display: flex;
    }
    .preview-text {
      font-size: 0.825rem;
      color: var(--text-muted);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-text.placeholder {
      font-style: italic;
    }

    /* Viewport (Chat Window) */
    .chat-viewport {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
    }

    /* selection splash */
    .no-selection-splash {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--text-muted);
      text-align: center;
    }
    .splash-icon-box {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--brand-gold) 10%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      border: 1px solid var(--brand-gold-soft);
    }
    .splash-icon-box i {
      font-size: 2.5rem;
      color: var(--brand-gold);
    }
    .no-selection-splash h2 {
      font-size: 1.5rem;
      color: var(--text-main);
      margin: 0 0 0.5rem;
    }
    .no-selection-splash p {
      font-size: 0.95rem;
      margin: 0;
    }

    /* active chat session layout */
    .active-chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
    }
    .back-btn {
      display: none;
      background: none;
      border: none;
      color: var(--text-main);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
    }
    .header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-deep);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: var(--text-main);
      border: 1px solid var(--border-color);
    }
    .header-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .header-meta {
      display: flex;
      flex-direction: column;
    }
    .header-name {
      font-weight: 600;
      color: var(--text-main);
      font-size: 1rem;
    }
    .back-to-inquiries {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.2s ease;
      margin-inline-start: auto;
    }
    .back-to-inquiries:hover {
      color: var(--brand-gold);
    }
    .back-to-inquiries i {
      font-size: 1.1rem;
    }

    /* Messages Logs */
    .messages-log {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: var(--bg-deep);
    }
    .loading-messages {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid var(--border-color);
      border-top-color: var(--brand-gold);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-messages-log {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .message-bubble-row {
      display: flex;
      gap: 0.75rem;
      max-width: 75%;
    }
    .message-bubble-row.sent {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .message-bubble-row.received {
      align-self: flex-start;
    }

    .msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-main);
      flex-shrink: 0;
      border: 1px solid var(--border-color);
    }
    .msg-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .msg-bubble-content {
      display: flex;
      flex-direction: column;
    }
    .sent .msg-bubble-content {
      align-items: flex-end;
    }
    .received .msg-bubble-content {
      align-items: flex-start;
    }

    .bubble {
      padding: 0.85rem 1.15rem;
      border-radius: 18px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      position: relative;
    }
    .sent .bubble {
      background: var(--brand-gold-dark);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .received .bubble {
      background: var(--bg-elevated);
      color: var(--text-main);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--border-color);
    }

    .bubble-text {
      margin: 0;
      font-size: 0.925rem;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    .bubble-image-box {
      max-width: 260px;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .bubble-image-box img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.2s;
    }
    .bubble-image-box img:hover {
      transform: scale(1.02);
    }

    .bubble-video-box {
      max-width: 280px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .bubble-video-box video {
      width: 100%;
      display: block;
    }

    .bubble-audio-box {
      min-width: 220px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .audio-note-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.9;
    }
    .bubble-audio-box audio {
      width: 100%;
      height: 36px;
    }

    .bubble-file-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      background: color-mix(in srgb, var(--text-main) 4%, transparent);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      min-width: 220px;
    }
    .file-card-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .file-card-info i {
      font-size: 1.75rem;
      color: var(--brand-gold);
    }
    .file-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .file-name {
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-main);
    }
    .sent .file-name {
      color: #fff;
    }
    .file-type {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .sent .file-type {
      color: rgba(255,255,255,0.7);
    }
    .file-download-btn {
      color: var(--brand-gold);
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }
    .file-download-btn:hover {
      color: var(--brand-gold-dark);
    }

    .msg-timestamp {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    /* Input panel actions */
    .input-panel {
      padding: 1.25rem;
      border-top: 1px solid var(--border-color);
      background: var(--bg-surface);
      position: relative;
    }
    .input-actions-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .input-icon-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.35rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .input-icon-btn:hover {
      color: var(--brand-gold);
      background: color-mix(in srgb, var(--brand-gold) 10%, transparent);
    }
    .input-actions-bar textarea {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background: var(--bg-deep);
      color: var(--text-main);
      resize: none;
      font-family: inherit;
      font-size: 0.9rem;
      box-sizing: border-box;
      line-height: 1.25;
      max-height: 100px;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-actions-bar textarea:focus {
      border-color: var(--brand-gold);
    }

    .send-message-btn {
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: not-allowed;
      transition: all 0.3s ease;
      flex-shrink: 0;
      font-size: 1.1rem;
      opacity: 0.7;
    }
    .send-message-btn.active {
      background: var(--brand-gold);
      color: #fff;
      cursor: pointer;
      opacity: 1;
    }
    .send-message-btn.active:hover {
      background: var(--brand-gold-dark);
    }

    /* Voice Note Recorder Overlay inside input panel */
    .recorder-overlay {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: var(--bg-deep);
      border: 1px solid var(--brand-gold-soft);
      padding: 0.6rem 1.25rem;
      border-radius: 30px;
      animation: slideUp 0.2s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .recording-pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 1.2s infinite alternate;
      flex-shrink: 0;
    }
    @keyframes pulse {
      from { transform: scale(0.9); opacity: 0.5; }
      to { transform: scale(1.3); opacity: 1; }
    }

    .recording-timer {
      font-family: monospace;
      font-size: 0.9rem;
      font-weight: 700;
      color: #ef4444;
      flex-shrink: 0;
    }
    .waveform-canvas {
      flex: 1;
      height: 30px;
      background: transparent;
    }
    .recorder-actions {
      display: flex;
      gap: 0.5rem;
    }
    .recorder-actions .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.95rem;
      transition: transform 0.2s;
    }
    .recorder-actions .action-btn:hover {
      transform: scale(1.1);
    }
    .cancel-record {
      background: color-mix(in srgb, #ef4444 10%, transparent);
      color: #ef4444;
    }
    .stop-record {
      background: var(--brand-gold);
      color: #fff;
    }

    /* Lightbox Overlay */
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
    }
    .lightbox-content {
      max-width: 90%;
      max-height: 90%;
      position: relative;
    }
    .lightbox-content img {
      max-width: 100%;
      max-height: 85vh;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .close-lightbox {
      position: absolute;
      top: -40px;
      right: 0;
      background: none;
      border: none;
      color: #fff;
      font-size: 2rem;
      cursor: pointer;
    }

    .spinner-xs {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }

    /* RTL Direction Overrides */
    .rtl {
      direction: rtl;
    }
    .rtl .send-message-btn i {
      transform: scaleX(-1);
    }
    .rtl .chat-sidebar {
      border-right: none;
      border-left: 1px solid var(--border-color);
    }
    .rtl .chat-item-card.active {
      border-left: none;
      border-right: 3px solid var(--brand-gold);
    }
    .rtl .bubble-file-card {
      direction: rtl;
    }
    .rtl .msg-avatar {
      margin-left: 0;
    }
    .rtl .message-bubble-row.sent {
      align-self: flex-end;
      flex-direction: row;
    }
    .rtl .message-bubble-row.received {
      align-self: flex-start;
      flex-direction: row-reverse;
    }

    /* Mobile Responsive Layout */
    @media (max-width: 768px) {
      .chat-sidebar {
        width: 100%;
      }
      .chat-sidebar.hidden-mobile {
        display: none;
      }
      .chat-viewport.hidden-mobile {
        display: none;
      }
      .back-btn {
        display: block;
      }
    }
  `]
})
export class UserChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollPane') scrollPane!: ElementRef<HTMLDivElement>;
  @ViewChild('mediaPicker') mediaPicker!: ElementRef<HTMLInputElement>;
  @ViewChild('filePicker') filePicker!: ElementRef<HTMLInputElement>;
  @ViewChild('visualizer') visualizerCanvas!: ElementRef<HTMLCanvasElement>;

  chats: any[] = [];
  filteredChats: any[] = [];
  selectedChat: any = null;
  messages: any[] = [];
  currentUser: User | null = null;
  isRtl = false;

  // Search/Filters
  searchQuery = '';
  loadingChats = true;
  loadingMessages = false;

  // Active inputs
  newMessageText = '';
  uploadingAttachment = false;

  // Socket
  private socket: any = null;
  onlineUsers = new Set<string>();

  // Recorder states
  isRecording = false;
  recordDuration = 0;
  private recordIntervalRef: any = null;
  private mediaRecorder: any = null;
  private audioChunks: any[] = [];

  // Audio Context for Visualizer
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  // Lightbox
  lightboxUrl: string | null = null;
  routeChatId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private chatService: UserDashboardService,
    private socketService: SocketService,
    private authService: AuthService,
    private notif: NotificationService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUser;
    this.isRtl = this.translate.currentLang === 'ar';
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.isRtl = event.lang === 'ar';
      });
  }

  ngOnInit(): void {
    this.loadChats();
    this.initSocketConnection();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const cid = params['chatId'];
      if (cid) {
        this.routeChatId = cid;
        this.selectChatByIdIfLoaded(cid);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.selectedChat) {
      this.socketService.emit('leaveChat', { chatId: this.selectedChat._id });
    }
    if (this.socket) {
      this.socket.off('newMessage');
    }
    this.cancelRecord();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // Socket Connections
  private initSocketConnection(): void {
    this.socketService.socket$
      .pipe(takeUntil(this.destroy$))
      .subscribe((socketInstance) => {
        if (socketInstance) {
          this.socket = socketInstance;

          // Listen for new incoming messages
          this.socket.on('newMessage', (msg: any) => {
            if (this.selectedChat && msg.chatId === this.selectedChat._id) {
              // Deduplicate and append message
              if (!this.messages.some(m => m._id === msg._id)) {
                this.messages.push(msg);
                this.scrollToBottom(true);
              }
              // Mark lastMessage in parent chat row list
              this.updateLastMessageInList(msg);
            } else {
              // Notification / Update list
              this.updateLastMessageInList(msg);
            }
          });

          // Join active chat room if one was selected during reconnection
          if (this.selectedChat) {
            this.socketService.emit('joinChat', { chatId: this.selectedChat._id });
          }
        }
      });
  }

  // Chats List Fetching
  loadChats(): void {
    this.loadingChats = true;
    this.chatService.getChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.chats = data;
          this.filteredChats = [...this.chats];
          this.loadingChats = false;
          if (this.routeChatId) {
            this.selectChatByIdIfLoaded(this.routeChatId);
          }
        },
        error: () => {
          this.loadingChats = false;
        }
      });
  }

  selectChatByIdIfLoaded(chatId: string): void {
    if (!this.chats || this.chats.length === 0) return;
    const chat = this.chats.find(c => c._id === chatId);
    if (chat) {
      this.selectChat(chat);
    }
  }

  filterChats(): void {
    if (!this.searchQuery.trim()) {
      this.filteredChats = [...this.chats];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredChats = this.chats.filter(c => {
      const p = this.getParticipant(c);
      return p?.name?.toLowerCase().includes(q) || p?.email?.toLowerCase().includes(q);
    });
  }

  // Select Chat Session
  selectChat(chat: any): void {
    if (this.selectedChat) {
      this.socketService.emit('leaveChat', { chatId: this.selectedChat._id });
    }
    this.selectedChat = chat;
    this.messages = [];
    this.loadingMessages = true;

    this.socketService.emit('joinChat', { chatId: chat._id });

    this.chatService.getChatMessages(chat._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msgs) => {
          this.messages = msgs;
          this.loadingMessages = false;
          this.scrollToBottom(true);
        },
        error: () => {
          this.loadingMessages = false;
        }
      });
  }

  closeChat(): void {
    if (this.selectedChat) {
      this.socketService.emit('leaveChat', { chatId: this.selectedChat._id });
    }
    this.selectedChat = null;
    this.messages = [];
  }

  navigateToInquiries(): void {
    this.router.navigate(['/dashboard/inquiries']);
  }

  // Chat Helpers
  getParticipant(chat: any): any {
    if (!chat || !chat.participants) return null;
    return chat.participants.find((p: any) => p._id !== this.currentUser?._id);
  }

  isParticipantOnline(pId: string | undefined): boolean {
    if (!pId) return false;
    // Real-time online tracker fallback. Since we do not have full tracker logic in backend,
    // we can return mock true or check dynamic arrays (we will assume active agents are always mock online/offline randomly or default true).
    return true; // Simplified fallback mock representation
  }

  isSentByMe(msg: any): boolean {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === this.currentUser?._id;
  }

  getPreviewSnippet(msg: any): string {
    if (!msg) return '';
    if (msg.messageType === 'text') return msg.text;
    if (msg.messageType === 'image') return '🖼️ Photo';
    if (msg.messageType === 'video') return '🎥 Video';
    if (msg.messageType === 'audio') return '🎙️ Voice note';
    return '📎 Attachment';
  }

  updateLastMessageInList(newMsg: any): void {
    this.chats = this.chats.map(c => {
      if (c._id === newMsg.chatId) {
        return { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt };
      }
      return c;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.filterChats();
  }

  // Send Messages
  sendTextMessage(): void {
    if (!this.newMessageText.trim() || !this.selectedChat || !this.socket) return;
    
    const payload = {
      chatId: this.selectedChat._id,
      text: this.newMessageText.trim(),
      messageType: 'text',
      fileUrl: null
    };

    this.socket.emit('sendMessage', payload);
    this.newMessageText = '';
  }

  onEnterPressed(event: any): void {
    event.preventDefault();
    this.sendTextMessage();
  }

  // Media Pickers triggers
  triggerMediaPicker(): void {
    this.mediaPicker.nativeElement.click();
  }

  triggerFilePicker(): void {
    this.filePicker.nativeElement.click();
  }

  onMediaSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.uploadingAttachment = true;
    this.chatService.uploadChatAttachment(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          const payload = {
            chatId: this.selectedChat._id,
            text: file.name,
            messageType: type,
            fileUrl: res.secure_url
          };
          this.socket.emit('sendMessage', payload);
          this.uploadingAttachment = false;
        },
        error: () => {
          this.uploadingAttachment = false;
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.uploadingAttachment = true;
    this.chatService.uploadChatAttachment(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const payload = {
            chatId: this.selectedChat._id,
            text: file.name,
            messageType: 'file',
            fileUrl: res.secure_url
          };
          this.socket.emit('sendMessage', payload);
          this.uploadingAttachment = false;
        },
        error: () => {
          this.uploadingAttachment = false;
        }
      });
  }

  // HTML5 MediaRecorder voice notes
  startRecord(): void {
    if (this.isRecording) return;
    this.audioChunks = [];
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        this.isRecording = true;
        this.recordDuration = 0;

        // Visualizer Canvas context creation
        setTimeout(() => this.initCanvasVisualizer(stream), 50);

        this.recordIntervalRef = setInterval(() => {
          this.recordDuration += 1000;
        }, 1000);

        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const streamTracks = stream.getTracks();
          streamTracks.forEach(track => track.stop());

          if (this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const file = new File([audioBlob], 'voice-note.wav', { type: 'audio/wav' });

            this.uploadingAttachment = true;
            this.chatService.uploadChatAttachment(file)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (res) => {
                  const payload = {
                    chatId: this.selectedChat._id,
                    text: 'Voice Note',
                    messageType: 'audio',
                    fileUrl: res.secure_url
                  };
                  this.socket.emit('sendMessage', payload);
                  this.uploadingAttachment = false;
                },
                error: () => {
                  this.uploadingAttachment = false;
                }
              });
          }
        };

        this.mediaRecorder.start();
      })
      .catch(() => {
        this.notif.show(this.translate.instant('CAMERA_PERMISSION_DENIED'), 'error');
      });
  }

  stopRecord(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.cleanupRecordState();
  }

  cancelRecord(): void {
    if (!this.isRecording) return;
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null; // Suppress triggers
      this.mediaRecorder.stop();
    }
    this.cleanupRecordState();
  }

  private cleanupRecordState(): void {
    this.isRecording = false;
    if (this.recordIntervalRef) {
      clearInterval(this.recordIntervalRef);
      this.recordIntervalRef = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private initCanvasVisualizer(stream: MediaStream): void {
    if (!this.visualizerCanvas) return;
    const canvas = this.visualizerCanvas.nativeElement;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.audioCtx.createMediaStreamSource(stream);
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    source.connect(this.analyserNode);

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRecording) return;
      this.animationFrameId = requestAnimationFrame(draw);
      this.analyserNode!.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 4;
        
        // draw premium gold color lines matching brand aesthetics
        canvasCtx.fillStyle = `rgba(197, 160, 89, ${barHeight / 64 + 0.3})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    draw();
  }

  // Lightbox
  openLightbox(url: string): void {
    this.lightboxUrl = url;
  }

  closeLightbox(): void {
    this.lightboxUrl = null;
  }

  // Scrolling logic
  private scrollToBottom(force = false): void {
    try {
      if (this.scrollPane) {
        const el = this.scrollPane.nativeElement;
        // Scroll only if user is already near bottom or forced
        const threshold = 150;
        const isNearBottom = el.scrollHeight - el.clientHeight - el.scrollTop < threshold;
        if (isNearBottom || force) {
          el.scrollTop = el.scrollHeight;
        }
      }
    } catch {}
  }
}
