import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Returns',
  description: 'Returns and refunds policy',
};

export default function ReturnsPage() {
  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Returns and refunds policy will be added here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
