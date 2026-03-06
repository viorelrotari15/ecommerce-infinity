import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBranding } from '@/lib/branding';
import { getServerLanguage } from '@/lib/utils/language';
import { getServerT, translationKeys } from '@/lib/utils/translations-shared';
import { ReturnsRequestForm } from '@/components/client/returns/returns-request-form';

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
    title: t(translationKeys.returns.title, 'Right of Withdrawal, Returns & Cancellation'),
    description: t(translationKeys.returns.title, 'Right of Withdrawal, Returns & Cancellation'),
  };
}

export default async function ReturnsPage({
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
        email?: string;
      }
    | undefined;

  const supportEmail = company?.email || 'misticoperfumerie@gmail.com';
  const companyName = company?.displayName || company?.legalName || branding.name;

  return (
    <div className="container py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.returns.title, 'Right of Withdrawal, Returns & Cancellation')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.policyTitle, 'Cancellation Policy')}
            </h2>
            <p>{t(translationKeys.returns.policyIntro, 'Consumers have a right of withdrawal of fourteen days.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.withdrawalTitle, 'Right of Withdrawal')}
            </h2>
            <p>{t(translationKeys.returns.withdrawalP1, 'You have the right to withdraw from this contract within 14 days without giving any reason. The withdrawal period will expire after 14 days from the day on which you, or a third party, acquires physical possession of the goods.')}</p>
            <p>
              {t(translationKeys.returns.withdrawalP2, 'To exercise the right of withdrawal, you must inform us ({companyName}) by means of a clear statement of your decision to withdraw from this contract.').replace('{companyName}', companyName)}
            </p>
            <p>{t(translationKeys.returns.withdrawalP3, 'To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.consequencesTitle, 'Consequences of Withdrawal')}
            </h2>
            <p>{t(translationKeys.returns.consequencesP1, 'If you withdraw from this contract, we shall reimburse to you all payments received from you, including the costs of delivery, without undue delay and not later than fourteen days after we are informed about your decision to withdraw from this contract.')}</p>
            <p>{t(translationKeys.returns.consequencesP2, 'We may withhold reimbursement until we have received the goods back or you have supplied evidence of having sent back the goods.')}</p>
            <p>{t(translationKeys.returns.consequencesP3, 'You shall send back the goods without undue delay and in any event not later than fourteen days from the day on which you communicate your withdrawal from this contract to us. You bear the direct cost of returning the goods.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.exceptionsTitle, 'Exceptions to the Right of Withdrawal')}
            </h2>
            <p>{t(translationKeys.returns.exceptionsP1, 'The right of withdrawal does not apply to the supply of sealed goods which are not suitable for return due to health protection or hygiene reasons, if their seal has been removed after delivery.')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.formTitle, 'Model Withdrawal Form')}
            </h2>
            <p>{t(translationKeys.returns.formIntro, '(If you want to cancel the contract, please fill out and return this form.)')}</p>
            <div className="bg-muted/50 rounded-md p-4 text-sm space-y-2">
              <p>{t(translationKeys.returns.formLine1, '– To {companyName}{email}').replace('{companyName}', companyName).replace('{email}', supportEmail ? `, ${supportEmail}` : '')}</p>
              <p>{t(translationKeys.returns.formLine2, '– I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*)')}</p>
              <p>{t(translationKeys.returns.formLine3, '– Ordered on (*)/received on (*)')}</p>
              <p>{t(translationKeys.returns.formLine4, '– Name of consumer(s)')}</p>
              <p>{t(translationKeys.returns.formLine5, '– Address of consumer(s)')}</p>
              <p>{t(translationKeys.returns.formLine6, '– Signature of consumer(s) (only if this form is notified on paper)')}</p>
              <p className="text-xs text-muted-foreground">{t(translationKeys.returns.formNote, '(*) Delete as appropriate.')}</p>
            </div>
          </section>

          <section id="anulare">
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.cancellationTitle, 'Cancel Articles or Orders')}
            </h2>
            <p>{t(translationKeys.returns.cancellationP1, 'You have placed an order but wish to cancel it? No problem! As long as your order has not yet been processed for dispatch, you can do so quickly and easily.')}</p>
            <p>{t(translationKeys.returns.cancellationP2, 'However, if the ordered goods are already in the dispatch process, processing can no longer be stopped. In this case, delivery will proceed as scheduled. After receiving the parcel, you can exercise your right of withdrawal and return the package.')}</p>
            <p>{t(translationKeys.returns.cancellationP3, 'Please note that our primary goal is to dispatch ordered products as quickly as possible. Therefore, after receiving an order, processing steps are triggered immediately.')}</p>
            <p>{t(translationKeys.returns.cancellationP4, 'Want to cancel? Please contact our customer service. You will be informed by e-mail of the confirmation of cancellation. The refund will be made to the payment method used when placing the order.')}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              {t(translationKeys.returns.contactTitle, 'How to Request Withdrawal, Return or Cancellation')}
            </h2>
            <p>{t(translationKeys.returns.contactP1, 'To initiate a withdrawal, return or cancellation, please fill in the form below. We will contact you at the e-mail address you provide.')}</p>
            <ReturnsRequestForm />
            <p className="text-xs text-muted-foreground">
              {t(translationKeys.returns.contactNote, 'Contact address for withdrawals, returns and cancellations:')}{' '}
              <span className="font-medium">{supportEmail}</span>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
