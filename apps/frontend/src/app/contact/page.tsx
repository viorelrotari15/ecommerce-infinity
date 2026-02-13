import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with us',
};

export default function ContactPage() {
  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Contact information and form will be added here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
