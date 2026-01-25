'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isAdmin } from '@/lib/auth';
import {
  useAdminShippingMethods,
  useAdminShippingRules,
  useUpdateAdminShippingMethod,
  useUpdateAdminShippingRule,
} from '@/lib/hooks/use-pricing-admin';
import { Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import { DEFAULT_REGION_CODE } from '@/lib/config';

export default function ShippingAdminPage() {
  const router = useRouter();
  const t = useT();
  const { toast } = useToast();
  const { data: methods = [], isLoading: loadingMethods } = useAdminShippingMethods(
    DEFAULT_REGION_CODE
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const { data: rules = [], isLoading: loadingRules } = useAdminShippingRules(
    selectedMethodId || undefined
  );

  const updateMethod = useUpdateAdminShippingMethod();
  const updateRule = useUpdateAdminShippingRule();

  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [methodForm, setMethodForm] = useState({
    code: '',
    name: '',
    carrier: '',
    isExpress: false,
    isActive: true,
  });

  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({
    shippingMethodId: '',
    minSubtotal: '0',
    maxSubtotal: '',
    price: '0',
    isActive: true,
  });

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    if (!selectedMethodId && methods.length) {
      setSelectedMethodId(methods[0].id);
    }
  }, [methods, selectedMethodId]);

  const openEditMethodDialog = (method: any) => {
    setEditingMethodId(method.id);
    setMethodForm({
      code: method.code,
      name: method.name,
      carrier: method.carrier,
      isExpress: method.isExpress,
      isActive: method.isActive,
    });
    setIsMethodDialogOpen(true);
  };

  const handleSaveMethod = async () => {
    if (!methodForm.code || !methodForm.name) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.common.fillRequired, 'Please fill in the name field'),
      });
      return;
    }

    try {
      if (!editingMethodId) {
        return;
      }
      await updateMethod.mutateAsync({
        id: editingMethodId,
        payload: {
          name: methodForm.name,
          carrier: methodForm.carrier,
          isExpress: methodForm.isExpress,
          isActive: methodForm.isActive,
        },
      });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.shipping.methodUpdateSuccess, 'Shipping method updated successfully!'),
      });
      setIsMethodDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const openEditRuleDialog = (rule: any) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      shippingMethodId: rule.shippingMethodId,
      minSubtotal: String(rule.minSubtotal),
      maxSubtotal: rule.maxSubtotal == null ? '' : String(rule.maxSubtotal),
      price: String(rule.price),
      isActive: rule.isActive,
    });
    setIsRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      if (!editingRuleId) {
        return;
      }
      await updateRule.mutateAsync({
        id: editingRuleId,
        payload: {
          price: Number(ruleForm.price),
          isActive: ruleForm.isActive,
        },
      });
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.shipping.ruleUpdateSuccess, 'Shipping rule updated successfully!'),
      });
      setIsRuleDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error.message || t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(translationKeys.admin.shipping.title, 'Shipping')}</h1>
          <p className="text-muted-foreground mt-2">
            {t(translationKeys.admin.shipping.description, 'Manage shipping methods and rules')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.shipping.methodsTitle, 'Shipping methods')}</CardTitle>
          <CardDescription>{t(translationKeys.admin.shipping.methodsDescription, 'Configure carriers and service levels')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMethods ? (
            <p className="text-muted-foreground">{t(translationKeys.common.loading, 'Loading...')}</p>
          ) : methods.length === 0 ? (
            <p className="text-muted-foreground">{t(translationKeys.admin.shipping.noMethods, 'No shipping methods configured')}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {methods.map((method: any) => (
                <Card key={method.id}>
                  <CardHeader>
                    <CardTitle>{method.name}</CardTitle>
                    <CardDescription>
                      {method.code} · {method.carrier}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {method.isExpress
                        ? t(translationKeys.admin.shipping.express, 'Express')
                        : t(translationKeys.admin.shipping.standard, 'Standard')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {method.isActive ? t(translationKeys.common.active, 'Active') : t(translationKeys.common.inactive, 'Inactive')}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => openEditMethodDialog(method)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t(translationKeys.common.edit, 'Edit')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(translationKeys.admin.shipping.rulesTitle, 'Shipping rules')}</CardTitle>
          <CardDescription>{t(translationKeys.admin.shipping.rulesDescription, 'Define pricing tiers by subtotal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="methodFilter">{t(translationKeys.admin.shipping.methodFilter, 'Shipping method')}</Label>
            <select
              id="methodFilter"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedMethodId}
              onChange={(event) => setSelectedMethodId(event.target.value)}
            >
              {methods.map((method: any) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {loadingRules ? (
            <p className="text-muted-foreground">{t(translationKeys.common.loading, 'Loading...')}</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground">{t(translationKeys.admin.shipping.noRules, 'No rules configured for this method')}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rules.map((rule: any) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <CardTitle>
                      {t(translationKeys.admin.shipping.subtotalRange, 'Subtotal')}: {rule.minSubtotal} -{' '}
                      {rule.maxSubtotal ?? '∞'}
                    </CardTitle>
                    <CardDescription>
                      {t(translationKeys.admin.shipping.price, 'Price')}: {rule.price}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {rule.isActive ? t(translationKeys.common.active, 'Active') : t(translationKeys.common.inactive, 'Inactive')}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => openEditRuleDialog(rule)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t(translationKeys.common.edit, 'Edit')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isMethodDialogOpen} onOpenChange={setIsMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethodId
                ? t(translationKeys.admin.shipping.editMethodTitle, 'Edit shipping method')
                : t(translationKeys.admin.shipping.createMethodTitle, 'Create shipping method')}
            </DialogTitle>
            <DialogDescription>
              {t(translationKeys.admin.shipping.methodDialogDescription, 'Set up carrier and service details')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="method-name">{t(translationKeys.common.name, 'Name')}</Label>
              <Input
                id="method-name"
                value={methodForm.name}
                onChange={(event) => setMethodForm({ ...methodForm, name: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="method-carrier">{t(translationKeys.admin.shipping.carrier, 'Carrier')}</Label>
              <Input
                id="method-carrier"
                value={methodForm.carrier}
                onChange={(event) => setMethodForm({ ...methodForm, carrier: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="method-active"
                type="checkbox"
                className="h-4 w-4"
                checked={methodForm.isActive}
                onChange={(event) => setMethodForm({ ...methodForm, isActive: event.target.checked })}
              />
              <Label htmlFor="method-active">{t(translationKeys.common.active, 'Active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMethodDialogOpen(false)}>
              {t(translationKeys.common.cancel, 'Cancel')}
            </Button>
            <Button onClick={handleSaveMethod} disabled={updateMethod.isPending}>
              {editingMethodId
                ? t(translationKeys.common.update, 'Update')
                : t(translationKeys.common.update, 'Update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRuleId
                ? t(translationKeys.admin.shipping.editRuleTitle, 'Edit shipping rule')
                : t(translationKeys.admin.shipping.createRuleTitle, 'Create shipping rule')}
            </DialogTitle>
            <DialogDescription>
              {t(translationKeys.admin.shipping.ruleDialogDescription, 'Define pricing by order subtotal')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rule-price">{t(translationKeys.admin.shipping.price, 'Price')}</Label>
              <Input
                id="rule-price"
                type="number"
                value={ruleForm.price}
                onChange={(event) => setRuleForm({ ...ruleForm, price: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="rule-active"
                type="checkbox"
                className="h-4 w-4"
                checked={ruleForm.isActive}
                onChange={(event) => setRuleForm({ ...ruleForm, isActive: event.target.checked })}
              />
              <Label htmlFor="rule-active">{t(translationKeys.common.active, 'Active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              {t(translationKeys.common.cancel, 'Cancel')}
            </Button>
            <Button onClick={handleSaveRule} disabled={updateRule.isPending}>
              {editingRuleId
                ? t(translationKeys.common.update, 'Update')
                : t(translationKeys.common.update, 'Update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
