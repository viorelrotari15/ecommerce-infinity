import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service',
};

export default function TermsPage() {
  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Terms of service content will be added here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
