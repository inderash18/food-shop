import { Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from './ui/EmptyState';
import { Button } from './ui/Button';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <EmptyState
      icon={<Construction className="h-7 w-7 text-gray-400" />}
      title={title}
      description="This section is under construction and will be available soon."
      action={
        <Link to="/">
          <Button variant="secondary">Back to home</Button>
        </Link>
      }
    />
  );
}
