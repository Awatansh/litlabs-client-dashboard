'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SectionHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import { FileText, Download, UploadCloud, FolderOpen } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useState } from 'react';

export default function DeliverablesPage() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: deliverables, isLoading } = useQuery({
    queryKey: ['deliverables'],
    queryFn: async () => {
      const resp = await api.get('/api/deliverables');
      return resp.data;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // 1. Get presigned URL
      const { data } = await api.post(`/api/deliverables/upload-url?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}`);
      
      // 2. Upload directly to MinIO
      await fetch(data.upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // 3. Register deliverable on backend
      let fileType = 'document';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type === 'application/pdf') fileType = 'pdf';

      await api.post('/api/deliverables', {
        title: file.name,
        description: 'Uploaded by client',
        file_url: data.object_key,
        file_type: fileType,
        file_size_bytes: file.size
      });

      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      alert('File uploaded and registered successfully!');
    } catch (err) {
      alert('Failed to upload file.');
      console.error(err);
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  if (isLoading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="max-w-6xl fade-in-up">
      <SectionHeader
        title="Deliverables & Assets"
        subtitle="Access all project files, creatives, and strategy documents."
        action={
          <div className="relative">
            <input
              type="file"
              onChange={handleUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              disabled={isUploading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Upload Asset
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-5 border-blue-200 bg-blue-50 cursor-pointer hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Brand Assets</div>
              <div className="text-xs text-slate-500">Logos, fonts, guidelines</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 border-emerald-200 bg-emerald-50 cursor-pointer hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Ad Creatives</div>
              <div className="text-xs text-slate-500">Banners, videos, copy</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 border-purple-200 bg-purple-50 cursor-pointer hover:border-purple-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Strategy Docs</div>
              <div className="text-xs text-slate-500">Briefs, plans, research</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {deliverables?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left p-4 font-medium">File Name</th>
                <th className="text-left p-4 font-medium">Folder</th>
                <th className="text-left p-4 font-medium">Size</th>
                <th className="text-left p-4 font-medium">Uploaded</th>
                <th className="text-right p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deliverables.map((file: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-800 font-medium">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-500" />
                      {file.name}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{file.folder}</td>
                  <td className="p-4 text-slate-600">{file.size}</td>
                  <td className="p-4 text-slate-600">{timeAgo(file.uploaded_at)}</td>
                  <td className="p-4 text-right">
                    <a
                      href={file.download_url || '#'}
                      target={file.download_url ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-block text-blue-600 hover:text-blue-500"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<FileText className="w-12 h-12 mx-auto text-slate-400" />}
            title="No deliverables yet"
            description="When we complete work like graphics, reports, or copy, they will appear here for you to download."
          />
        )}
      </div>
    </div>
  );
}
