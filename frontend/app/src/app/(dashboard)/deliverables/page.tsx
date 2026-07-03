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
        <div className="glass-card p-5 border-blue-500/20 bg-blue-500/5 cursor-pointer hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Brand Assets</div>
              <div className="text-xs text-slate-400">Logos, fonts, guidelines</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Ad Creatives</div>
              <div className="text-xs text-slate-400">Banners, videos, copy</div>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 border-purple-500/20 bg-purple-500/5 cursor-pointer hover:border-purple-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Strategy Docs</div>
              <div className="text-xs text-slate-400">Briefs, plans, research</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {deliverables?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-xs text-slate-400 border-b border-slate-700/50">
                <th className="text-left p-4 font-medium">File Name</th>
                <th className="text-left p-4 font-medium">Folder</th>
                <th className="text-left p-4 font-medium">Size</th>
                <th className="text-left p-4 font-medium">Uploaded</th>
                <th className="text-right p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {deliverables.map((file: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-200 font-medium">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {file.name}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{file.folder}</td>
                  <td className="p-4 text-slate-400">{file.size}</td>
                  <td className="p-4 text-slate-400">{timeAgo(file.uploaded_at)}</td>
                  <td className="p-4 text-right">
                    <button className="text-blue-400 hover:text-blue-300">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<FileText className="w-12 h-12 mx-auto text-slate-600" />}
            title="No deliverables yet"
            description="When we complete work like graphics, reports, or copy, they will appear here for you to download."
          />
        )}
      </div>
    </div>
  );
}
