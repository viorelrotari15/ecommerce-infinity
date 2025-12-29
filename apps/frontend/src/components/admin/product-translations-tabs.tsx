'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguages } from '@/lib/hooks/use-languages';
import { useProductTranslations, useCreateProductTranslation, useUpdateProductTranslation } from '@/lib/hooks/use-product-translations';
import { Save, Plus } from 'lucide-react';

interface ProductTranslationsTabsProps {
  productId: string;
  defaultName?: string;
  defaultDescription?: string;
  defaultShortDescription?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
}

export function ProductTranslationsTabs({
  productId,
  defaultName = '',
  defaultDescription = '',
  defaultShortDescription = '',
  defaultMetaTitle = '',
  defaultMetaDescription = '',
}: ProductTranslationsTabsProps) {
  const { data: languages = [] } = useLanguages(true);
  const { data: translations = [] } = useProductTranslations(productId);
  const createTranslation = useCreateProductTranslation();
  const updateTranslation = useUpdateProductTranslation();

  const [translationData, setTranslationData] = useState<
    Record<string, {
      name: string;
      description: string;
      shortDescription: string;
      metaTitle: string;
      metaDescription: string;
    }>
  >({});

  // Initialize translation data
  useEffect(() => {
    const data: Record<string, any> = {};
    languages.forEach((lang) => {
      const existing = translations.find((t) => t.language === lang.code);
      data[lang.code] = {
        name: existing?.name || defaultName,
        description: existing?.description || defaultDescription,
        shortDescription: existing?.shortDescription || defaultShortDescription,
        metaTitle: existing?.metaTitle || defaultMetaTitle,
        metaDescription: existing?.metaDescription || defaultMetaDescription,
      };
    });
    setTranslationData(data);
  }, [translations, languages, defaultName, defaultDescription, defaultShortDescription, defaultMetaTitle, defaultMetaDescription]);

  const handleSave = async (language: string) => {
    const data = translationData[language];
    if (!data) return;

    const existing = translations.find((t) => t.language === language);

    try {
      if (existing) {
        await updateTranslation.mutateAsync({
          productId,
          language,
          ...data,
        });
      } else {
        await createTranslation.mutateAsync({
          productId,
          language,
          ...data,
        });
      }
      alert('Translation saved successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to save translation');
    }
  };

  const activeLanguages = languages.filter((l) => l.isActive);
  const defaultLanguage = languages.find((l) => l.isDefault);

  if (activeLanguages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Translations</CardTitle>
          <CardDescription>No active languages configured</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Translations</CardTitle>
        <CardDescription>
          Manage translations for this product in different languages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultLanguage?.code || activeLanguages[0]?.code}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${activeLanguages.length + 1}, minmax(0, 1fr))` }}>
            {activeLanguages.map((lang) => {
              const hasTranslation = translations.some((t) => t.language === lang.code);
              return (
                <TabsTrigger key={lang.code} value={lang.code} className="relative">
                  {lang.name}
                  {lang.isDefault && <span className="ml-1 text-xs">★</span>}
                  {!hasTranslation && (
                    <span className="ml-1 text-xs text-muted-foreground">(missing)</span>
                  )}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="add" className="text-muted-foreground">
              <Plus className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {activeLanguages.map((lang) => (
            <TabsContent key={lang.code} value={lang.code} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${lang.code}`}>
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`name-${lang.code}`}
                    value={translationData[lang.code]?.name || ''}
                    onChange={(e) =>
                      setTranslationData({
                        ...translationData,
                        [lang.code]: {
                          ...translationData[lang.code],
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`shortDescription-${lang.code}`}>Short Description</Label>
                  <Textarea
                    id={`shortDescription-${lang.code}`}
                    value={translationData[lang.code]?.shortDescription || ''}
                    onChange={(e) =>
                      setTranslationData({
                        ...translationData,
                        [lang.code]: {
                          ...translationData[lang.code],
                          shortDescription: e.target.value,
                        },
                      })
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${lang.code}`}>Description</Label>
                  <Textarea
                    id={`description-${lang.code}`}
                    value={translationData[lang.code]?.description || ''}
                    onChange={(e) =>
                      setTranslationData({
                        ...translationData,
                        [lang.code]: {
                          ...translationData[lang.code],
                          description: e.target.value,
                        },
                      })
                    }
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`metaTitle-${lang.code}`}>Meta Title</Label>
                  <Input
                    id={`metaTitle-${lang.code}`}
                    value={translationData[lang.code]?.metaTitle || ''}
                    onChange={(e) =>
                      setTranslationData({
                        ...translationData,
                        [lang.code]: {
                          ...translationData[lang.code],
                          metaTitle: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`metaDescription-${lang.code}`}>Meta Description</Label>
                  <Textarea
                    id={`metaDescription-${lang.code}`}
                    value={translationData[lang.code]?.metaDescription || ''}
                    onChange={(e) =>
                      setTranslationData({
                        ...translationData,
                        [lang.code]: {
                          ...translationData[lang.code],
                          metaDescription: e.target.value,
                        },
                      })
                    }
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => handleSave(lang.code)}
                  disabled={createTranslation.isPending || updateTranslation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Translation
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

