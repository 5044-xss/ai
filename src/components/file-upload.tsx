// src/components/file-upload.tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { UploadIcon, XIcon, FileIcon } from 'lucide-react';

export interface FileUploadProps {
  /**
   * 接受的文件扩展名，例如 ['.pdf', '.docx']
   */
  accept?: string[];
  /**
   * 最大文件大小（字节），例如 10 * 1024 * 1024 (10MB)
   */
  maxSize?: number;
  /**
   * 当前选中的文件（受控）
   */
  value: File | null;
  /**
   * 文件变更回调
   */
  onChange: (file: File | null) => void;
  /**
   * 错误信息（由父组件控制）
   */
  error?: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 占位提示文本
   */
  placeholder?: string;
}

/**
 * 通用文件上传组件
 * 
 * 特性：
 * - 支持点击/拖拽上传
 * - 文件类型 & 大小校验
 * - 预览已选文件
 * - 受控组件（value/onChange）
 */
export function FileUpload({
  accept = [],
  maxSize,
  value,
  onChange,
  error,
  disabled = false,
  placeholder = '点击或拖拽文件到这里'
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    // 类型校验
    if (accept.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAccepted = accept.some(ext =>
        file.type === getMimeType(ext) || ext.toLowerCase() === fileExtension
      );
      if (!isAccepted) {
        return `仅支持以下格式：${accept.join(', ')}`;
      }
    }

    // 大小校验
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `文件不能超过 ${maxSizeMB} MB`;
    }

    return null;
  }, [accept, maxSize]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      // 通知父组件错误（可通过 onChange(null) + setError 实现）
      onChange(null);
      // 注意：错误信息建议由父组件统一管理，此处不直接 setState
      return;
    }

    onChange(file);
  }, [validateFile, onChange, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const clearFile = () => {
    onChange(null);
  };

  // 辅助函数：根据扩展名返回 MIME 类型（简化版）
  const getMimeType = (ext: string): string => {
    const map: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    return map[ext.toLowerCase()] || '';
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${dragActive ? 'border-primary bg-accent' : 'border-muted-foreground/30'
        } ${error ? 'border-red-500' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="p-6 text-center">
        {value ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{value.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearFile}
              disabled={disabled}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{placeholder}</p>
            {accept.length > 0 && (
              <p className="text-xs text-muted-foreground/70">
                支持格式：{accept.join(', ')}
                {maxSize && ` • 最大 ${(maxSize / (1024 * 1024)).toFixed(1)} MB`}
              </p>
            )}
            <Input
              type="file"
              accept={accept.join(',')}
              onChange={handleChange}
              className="hidden"
              id="file-upload-input"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mx-auto"
              onClick={() => document.getElementById('file-upload-input')?.click()}
              disabled={disabled}
            >
              选择文件
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}