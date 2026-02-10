'use client';

type EventHandler = (error: any) => void;

class EventEmitter {
  private listeners: { [event: string]: EventHandler[] } = {};

  on(event: string, listener: EventHandler): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: EventHandler): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, data: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => listener(data));
  }
}

export const errorEmitter = new EventEmitter();
