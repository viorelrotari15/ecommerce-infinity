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
    title: t(translationKeys.privacy.title, 'Privacy Policy'),
    description: t(translationKeys.privacy.operatorIntro, 'Detailed information about how we handle your personal data.'),
  };
}

export default async function PrivacyPage({
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
        phone?: string;
      }
    | undefined;

  const operatorName = company?.displayName || company?.legalName || branding.name;

  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.privacy.title, 'Privacy Policy')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.operatorTitle, 'Data Controller')}
            </h2>
            <p>
              {operatorName}
              {company?.street && (<><br />{company.street}</>)}
              {company?.postalCode && company?.city && (<><br />{company.postalCode} {company.city}</>)}
              {company?.country && (<><br />{company.country}</>)}
              {company?.email && (<><br />E-mail: {company.email}</>)}
              {company?.phone && (<><br />Tel.: {company.phone}</>)}
            </p>
            <p>{t(translationKeys.privacy.operatorIntro, 'We value your interest in our online store. Protecting your privacy is very important to us.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section1.title, '1. Access Data and Hosting')}
            </h2>
            <p>{t(translationKeys.privacy.section1.p1, 'You can visit our website without providing any personal information. This access data is evaluated exclusively for the purpose of ensuring the proper operation of the website and is deleted within one month of your visit.')}</p>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.privacy.section1.hostingTitle, 'Hosting')}
            </h3>
            <p>{t(translationKeys.privacy.section1.hostingP1, 'The hosting services for this website are provided in part by our service providers as part of data processing on our behalf. Our cooperation is based on standard data protection clauses issued by the European Commission.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section2.title, '2. Data Processing for Contract Fulfilment and Contact')}
            </h2>
            <h3 className="text-sm font-semibold text-foreground mt-2">
              {t(translationKeys.privacy.section2.sub1.title, '2.1 Data Processing for Contract Fulfilment')}
            </h3>
            <p>{t(translationKeys.privacy.section2.sub1.p1, 'For the purpose of processing the contract, we collect personal data when you voluntarily provide it as part of your order. Mandatory fields are marked as such.')}</p>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.privacy.section2.sub2.title, '2.2 Customer Account')}
            </h3>
            <p>{t(translationKeys.privacy.section2.sub2.p1, 'If you have consented to opening a customer account, we will use your data for the purpose of opening the account and storing your data for future orders. You can delete your customer account at any time.')}</p>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.privacy.section2.sub3.title, '2.3 Contact')}
            </h3>
            <p>{t(translationKeys.privacy.section2.sub3.p1, 'As part of our communication with customers, we collect personal data to process your requests if you voluntarily provide this data when contacting us.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section3.title, '3. Data Processing for Order Fulfilment')}
            </h2>
            <p>{t(translationKeys.privacy.section3.p1, 'For the purpose of fulfilling the contract, we will pass your data to the shipping service provider entrusted with delivery.')}</p>
            <p>{t(translationKeys.privacy.section3.p2, 'If you have given your express consent, we will pass your e-mail address and telephone number to the selected delivery service provider. Our delivery providers include: GLS Germany, DHL Paket GmbH and DPD Deutschland GmbH.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section4.title, '4. Data Processing for Payment Processing')}
            </h2>
            <p>{t(translationKeys.privacy.section4.p1, 'When processing payments, we work with technical service providers, credit institutions and payment service providers. We will pass the necessary data to the respective providers depending on the selected payment method.')}</p>
            <p>{t(translationKeys.privacy.section4.p2, 'If you choose Klarna payment services, we request your consent to transfer the data necessary for payment processing and for identity and credit checks to Klarna Bank AB (publ.), Sveavägen 46, 111 34 Stockholm, Sweden.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section5.title, '5. E-mail Advertising')}
            </h2>
            <h3 className="text-sm font-semibold text-foreground mt-2">
              {t(translationKeys.privacy.section5.sub1.title, '5.1 Newsletter')}
            </h3>
            <p>{t(translationKeys.privacy.section5.sub1.p1, 'When you subscribe to our newsletter, we use the data required for this purpose to send you our newsletter by e-mail on a regular basis, based on your consent. You can unsubscribe at any time.')}</p>
            <p>{t(translationKeys.privacy.section5.sub1.p2, 'Our newsletter contains tracking technologies (tracking pixels) that allow us to analyse open and click rates to optimise future campaigns.')}</p>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.privacy.section5.sub2.title, '5.2 Feedback Requests')}
            </h3>
            <p>{t(translationKeys.privacy.section5.sub2.p1, 'If you have given your consent, we will use your e-mail address to request a review of your order. Consent can be revoked at any time.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section6.title, '6. Cookies and Other Technologies')}
            </h2>
            <p>{t(translationKeys.privacy.section6.p1, 'We use cookies and similar technologies to make visiting our website more attractive and to enable certain functions. Session cookies are deleted after closing the browser; persistent cookies remain on your device.')}</p>
            <p>{t(translationKeys.privacy.section6.p2, 'Essential technologies (e.g. shopping cart function) do not require your consent. Non-essential technologies (analytics, marketing) require your prior consent, which you can withdraw at any time.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section7.title, '7. Use of Google Services and Other Third-Party Technologies')}
            </h2>
            <p>{t(translationKeys.privacy.section7.p1, 'We use services from Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland, including Google Analytics, Google Fonts, Google Tag Manager and the YouTube video plugin in extended privacy mode. Our cooperation is based on standard contractual clauses issued by the European Commission.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section8.title, '8. Social Networks')}
            </h2>
            <p>{t(translationKeys.privacy.section8.p1, 'Our website uses social buttons as simple HTML links, with no direct connection to social network servers when visiting our site. If you click a button, the respective social network website opens in a new browser window.')}</p>
            <p>{t(translationKeys.privacy.section8.p2, 'If you have given your consent to the respective social network operator, your data may be automatically collected when you visit our online presence on Facebook (Meta), Instagram (Meta) or Twitter/X.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.privacy.section9.title, '9. Your Rights')}
            </h2>
            <p>{t(translationKeys.privacy.section9.rights, 'As a data subject, you have the following rights:')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t(translationKeys.privacy.section9.r1, 'Art. 15 GDPR – right to request information about the data we process;')}</li>
              <li>{t(translationKeys.privacy.section9.r2, 'Art. 16 GDPR – right to request rectification of inaccurate or incomplete data;')}</li>
              <li>{t(translationKeys.privacy.section9.r3, 'Art. 17 GDPR – right to request erasure of your data;')}</li>
              <li>{t(translationKeys.privacy.section9.r4, 'Art. 18 GDPR – right to request restriction of processing;')}</li>
              <li>{t(translationKeys.privacy.section9.r5, 'Art. 20 GDPR – right to data portability;')}</li>
              <li>{t(translationKeys.privacy.section9.r6, 'Art. 77 GDPR – right to lodge a complaint with a supervisory authority.')}</li>
            </ul>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.privacy.section9.objectionTitle, 'Right to Object')}
            </h3>
            <p>{t(translationKeys.privacy.section9.objectionP1, 'To the extent that we process personal data based on our legitimate interests, you may object to this processing with future effect. For direct marketing purposes, you may exercise this right at any time.')}</p>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {t(translationKeys.privacy.section9.contactTitle, 'Contact Options')}
            </h3>
            <p>{t(translationKeys.privacy.section9.contactP1, 'If you have any questions about the collection, processing or use of your personal data, please contact us directly at the e-mail address indicated in our legal notice.')}</p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
