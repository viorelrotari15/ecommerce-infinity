import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy',
};

export default function PrivacyPage() {
  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Privacy policy content will be added here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
