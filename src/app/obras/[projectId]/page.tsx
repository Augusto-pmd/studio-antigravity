'use client';

import { ProjectDetailView } from '@/components/obras/project-detail-view';

export default function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  return <ProjectDetailView projectId={params.projectId} />;
}
