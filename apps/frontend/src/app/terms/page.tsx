import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBranding } from '@/lib/branding';
import { getServerLanguage } from '@/lib/utils/language';
import { getServerT, translationKeys } from '@/lib/utils/translations-shared';

export const dynamic = 'force-dynamic';

const branding = getBranding();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const lang = await getServerLanguage(await searchParams);
  const t = getServerT(lang);
  return {
    title: t(translationKeys.terms.title, 'General Terms and Conditions'),
    description: t(translationKeys.terms.title, 'General Terms and Conditions'),
  };
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const lang = await getServerLanguage(await searchParams);
  const t = getServerT(lang);

  const company = (branding as any).company as
    | {
        displayName?: string;
        legalName?: string;
        street?: string;
        postalCode?: string;
        city?: string;
        country?: string;
        email?: string;
      }
    | undefined;

  const companyName = company?.displayName || company?.legalName || branding.name;

  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.terms.title, 'General Terms and Conditions')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section1.title, '1. Scope')}
            </h2>
            <p>{t(translationKeys.terms.section1.p1, 'The following terms and conditions apply to all orders placed through our online store. Our online store is intended exclusively for consumers.')}</p>
            <p>{t(translationKeys.terms.section1.p2, 'A consumer is any natural person who concludes a legal transaction for purposes that are primarily attributable neither to their commercial nor to their self-employed professional activity.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section2.title, '2. Contracting Parties, Conclusion of Contract, Correction Options')}
            </h2>
            <p>{t(translationKeys.terms.section2.p1, 'The purchase contract is concluded with {companyName}.').replace('{companyName}', companyName)}</p>
            <p>{t(translationKeys.terms.section2.p2, 'The presentation of products in the online store does not constitute a legally binding offer, but rather a non-binding online catalogue.')}</p>
            <p>{t(translationKeys.terms.section2.p3, 'By clicking the order button, you submit a binding offer to purchase the goods contained in the shopping cart. Confirmation of receipt of your order will be sent by e-mail immediately after submission.')}</p>
            <p>{t(translationKeys.terms.section2.p4, 'We will accept your offer within two days:')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t(translationKeys.terms.section2.bullet1, 'We will send an acceptance declaration in a separate e-mail; or')}</li>
              <li>{t(translationKeys.terms.section2.bullet2, 'The payment transaction may be processed by our service provider or the selected payment service provider.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section3.title, '3. Contract Language, Storage of Contract Text')}
            </h2>
            <p>{t(translationKeys.terms.section3.p1, 'The language available for concluding the contract: Romanian/German.')}</p>
            <p>{t(translationKeys.terms.section3.p2, 'We save the contract text and send you the order details and our terms and conditions in text form. You can also view the contract text in your user account.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section4.title, '4. Delivery Conditions')}
            </h2>
            <p>{t(translationKeys.terms.section4.p1, 'Shipping costs are added to the product prices displayed. Details on shipping costs can be found in the individual offers and on the shipping information page.')}</p>
            <p>{t(translationKeys.terms.section4.p2, 'We deliver by courier only. Unfortunately, personal collection of goods is not possible.')}</p>
            <p>{t(translationKeys.terms.section4.p3, 'We do not deliver to parcel lockers.')}</p>
          </section>

          <section id="plata">
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section5.title, '5. Payment')}
            </h2>
            <p>{t(translationKeys.terms.section5.intro, 'The following payment methods are generally available in our store:')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.advance.title, 'Advance Payment')}
            </h3>
            <p>{t(translationKeys.terms.section5.advance.text, 'If you select advance payment, we will send you our bank details in a separate e-mail and deliver the goods after receiving payment.')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.creditCard.title, 'Credit Card')}
            </h3>
            <p>{t(translationKeys.terms.section5.creditCard.text, 'During the ordering process, you will enter your credit card details. Your card will be charged immediately after you place your order.')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.paypal.title, 'PayPal')}
            </h3>
            <p>{t(translationKeys.terms.section5.paypal.text, 'To pay via PayPal, you must be registered with PayPal, log in and confirm the payment instructions.')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.sofort.title, 'Sofort by Klarna')}
            </h3>
            <p>{t(translationKeys.terms.section5.sofort.text, 'To pay via Sofort GmbH, you must have a bank account enabled for online banking, log in and confirm the payment instructions.')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.googlePay.title, 'Google Pay')}
            </h3>
            <p>{t(translationKeys.terms.section5.googlePay.text, 'To pay via Google Pay, you must be registered with Google, have activated Google Pay and confirm the payment instructions.')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.applePay.title, 'Apple Pay')}
            </h3>
            <p>{t(translationKeys.terms.section5.applePay.text, 'To pay via Apple Pay, you must use the Safari browser, be registered with Apple, have Apple Pay enabled and confirm the payment instructions.')}</p>

            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.terms.section5.klarna.title, 'Klarna')}
            </h3>
            <p>{t(translationKeys.terms.section5.klarna.text, 'In cooperation with Klarna Bank AB (publ.), we offer the following options:')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>{t(translationKeys.terms.section5.klarna.account, 'Purchase on account via Klarna')}</strong></li>
              <li><strong>{t(translationKeys.terms.section5.klarna.debit, 'Klarna direct debit')}</strong></li>
              <li><strong>{t(translationKeys.terms.section5.klarna.installments, 'Payment in instalments via Klarna')}</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section6.title, '6. Retention of Title')}
            </h2>
            <p>{t(translationKeys.terms.section6.p1, 'The goods remain our property until full payment has been received.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section7.title, '7. Transport Damage')}
            </h2>
            <p>{t(translationKeys.terms.section7.p1, 'If goods are delivered with obvious transport damage, please report such damage to the delivery driver immediately and contact us without delay.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section8.title, '8. Warranty and Guarantees')}
            </h2>
            <h3 className="text-sm font-semibold text-foreground mt-2">
              {t(translationKeys.terms.section8.sub1.title, '8.1 Statutory Warranty')}
            </h3>
            <p>{t(translationKeys.terms.section8.sub1.p1, 'The statutory warranty rights apply.')}</p>
            <h3 className="text-sm font-semibold text-foreground mt-2">
              {t(translationKeys.terms.section8.sub2.title, '8.2 Guarantees and Customer Service')}
            </h3>
            <p>{t(translationKeys.terms.section8.sub2.p1, 'Information about any additional guarantees can be found with the product and on special information pages in the online store.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section9.title, '9. Liability')}
            </h2>
            <p>{t(translationKeys.terms.section9.p1, 'We are always liable without limitation for claims arising from damage caused by us, our legal representatives or agents, including in cases of:')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t(translationKeys.terms.section9.bullet1, 'injury to life, body or health;')}</li>
              <li>{t(translationKeys.terms.section9.bullet2, 'intentional or grossly negligent breach of obligations;')}</li>
              <li>{t(translationKeys.terms.section9.bullet3, 'guarantee promises, if agreed;')}</li>
              <li>{t(translationKeys.terms.section9.bullet4, 'scope of the Product Liability Act.')}</li>
            </ul>
            <p>{t(translationKeys.terms.section9.p2, 'In the case of slightly negligent breach of material contractual obligations, our liability is limited to the foreseeable damage. All other claims for damages are excluded.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.terms.section10.title, '10. Dispute Resolution')}
            </h2>
            <p>{t(translationKeys.terms.section10.p1, 'The European Commission provides a platform for online dispute resolution (ODR). We are neither obliged nor willing to participate in dispute resolution proceedings before a consumer arbitration board.')}</p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
