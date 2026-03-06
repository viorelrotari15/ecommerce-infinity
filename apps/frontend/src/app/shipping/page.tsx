import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerLanguage } from '@/lib/utils/language';
import { getServerT, translationKeys } from '@/lib/utils/translations-shared';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const lang = await getServerLanguage(await searchParams);
  const t = getServerT(lang);
  return {
    title: t(translationKeys.shipping.title, 'Shipping Costs & Order Information'),
    description: t(translationKeys.shipping.title, 'Shipping Costs & Order Information'),
  };
}

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const lang = await getServerLanguage(await searchParams);
  const t = getServerT(lang);

  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.shipping.title, 'Shipping Costs & Order Information')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.shipping.costsTitle, 'Shipping Costs')}
            </h2>
            <p>{t(translationKeys.shipping.costsP1, 'Shipping costs are added to the product prices displayed. Details on shipping costs can be found in the individual offers and during the ordering process.')}</p>
            <p>{t(translationKeys.shipping.costsP2, 'If you place multiple orders separately, shipping costs apply individually for each order. Combining multiple orders into a single parcel afterwards is not possible.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.shipping.processingTitle, 'Processing & Delivery Time')}
            </h2>
            <p>{t(translationKeys.shipping.processingP1, 'Your order is normally dispatched from our warehouse in Germany. We strive to ensure short delivery times. The actual delivery time depends on product availability and the delivery address.')}</p>
            <p>{t(translationKeys.shipping.processingP2, 'We deliver exclusively by courier. Unfortunately, personal collection of goods is not possible. We do not deliver to parcel lockers.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.shipping.trackingTitle, 'Parcel Tracking')}
            </h2>
            <p>{t(translationKeys.shipping.trackingP1, 'After dispatch, you will receive a confirmation e-mail with a link for parcel tracking. You can also check the current status of your order at any time in your customer account under "Order History".')}</p>
            <p>{t(translationKeys.shipping.trackingP2, 'If the courier does not find you at the first delivery attempt, the parcel may be left with a neighbour, at a collection point, or another delivery attempt may be made, depending on the service provider.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.shipping.problemsTitle, 'Delivery Problems')}
            </h2>
            <p>{t(translationKeys.shipping.problemsP1, 'If the status of your parcel does not update for several days or you suspect it has been lost, please contact our customer service. We will coordinate with the delivery service provider and inform you of the solution.')}</p>
            <p>{t(translationKeys.shipping.problemsP2, 'If you receive a visibly damaged or opened parcel, refuse acceptance if possible, or contact us immediately after receipt so that we can organise a replacement as quickly as possible.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.shipping.damagesTitle, 'Transport Damage')}
            </h2>
            <p>{t(translationKeys.shipping.damagesP1, 'If goods are delivered with obvious transport damage, please report these damages to the delivery driver immediately and contact us without delay. Your cooperation helps us assert our own claims against the carrier or transport insurer.')}</p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
