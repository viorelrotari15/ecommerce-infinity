import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Shipping Info',
  description: 'Shipping and delivery information',
};

export default function ShippingPage() {
  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Info</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Shipping and delivery details will be added here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
