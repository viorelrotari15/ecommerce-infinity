'use client';

import { useEffect, useState, useRef } from 'react';
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
  useCarouselSlidesAdmin,
  useCreateCarouselSlide,
  useUpdateCarouselSlide,
  useDeleteCarouselSlide,
} from '@/lib/hooks/use-carousel';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useConfirm } from '@/contexts/confirm-dialog-context';
import { useToast } from '@/hooks/use-toast';
import { useT, translationKeys } from '@/lib/utils/translations';
import Image from 'next/image';

const MAX_SLIDES = 9;

export default function AdminCarouselPage() {
  const router = useRouter();
  const t = useT();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { data: slides = [], isLoading } = useCarouselSlidesAdmin();
  const createSlide = useCreateCarouselSlide();
  const updateSlide = useUpdateCarouselSlide();
  const deleteSlide = useDeleteCarouselSlide();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth/login');
    }
  }, [router]);

  const openCreateDialog = () => {
    setEditingId(null);
    setLink('');
    setDesktopFile(null);
    setMobileFile(null);
    if (desktopInputRef.current) desktopInputRef.current.value = '';
    if (mobileInputRef.current) mobileInputRef.current.value = '';
    setIsDialogOpen(true);
  };

  const openEditDialog = (slide: { id: string; link: string | null }) => {
    setEditingId(slide.id);
    setLink(slide.link || '');
    setDesktopFile(null);
    setMobileFile(null);
    if (desktopInputRef.current) desktopInputRef.current.value = '';
    if (mobileInputRef.current) mobileInputRef.current.value = '';
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setLink('');
    setDesktopFile(null);
    setMobileFile(null);
  };

  const handleSave = async () => {
    const isEdit = !!editingId;
    if (!isEdit && !desktopFile) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.admin.carousel.desktopImageRequired, 'Desktop image is required.'),
      });
      return;
    }
    const formData = new FormData();
    if (link.trim()) formData.append('link', link.trim());
    if (desktopFile) formData.append('fileDesktop', desktopFile);
    if (mobileFile) formData.append('fileMobile', mobileFile);

    if (isEdit && !desktopFile && !mobileFile && link === (slides.find((s) => s.id === editingId)?.link || '')) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.validationError, 'Validation Error'),
        description: t(translationKeys.admin.carousel.editDescription, 'Update link and/or replace images.'),
      });
      return;
    }

    try {
      if (isEdit && editingId) {
        await updateSlide.mutateAsync({ id: editingId, formData });
        toast({
          variant: 'success',
          title: t(translationKeys.common.success, 'Success'),
          description: t(translationKeys.admin.carousel.updateSuccess, 'Carousel slide updated successfully!'),
        });
      } else {
        if (!desktopFile) return;
        const createFormData = new FormData();
        if (link.trim()) createFormData.append('link', link.trim());
        createFormData.append('fileDesktop', desktopFile);
        if (mobileFile) createFormData.append('fileMobile', mobileFile);
        await createSlide.mutateAsync(createFormData);
        toast({
          variant: 'success',
          title: t(translationKeys.common.success, 'Success'),
          description: t(translationKeys.admin.carousel.createSuccess, 'Carousel slide created successfully!'),
        });
      }
      closeDialog();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error instanceof Error ? error.message : t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t(translationKeys.admin.carousel.deleteTitle, 'Delete carousel slide'),
      description: t(translationKeys.admin.carousel.deleteDescription, 'Are you sure you want to delete this slide? This action cannot be undone.'),
    });
    if (!confirmed) return;
    try {
      await deleteSlide.mutateAsync(id);
      toast({
        variant: 'success',
        title: t(translationKeys.common.success, 'Success'),
        description: t(translationKeys.admin.carousel.deleteSuccess, 'Carousel slide deleted successfully!'),
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(translationKeys.common.error, 'Error'),
        description: error instanceof Error ? error.message : t(translationKeys.common.failed, 'Failed'),
      });
    }
  };

  const atMaxSlides = slides.length >= MAX_SLIDES;

  if (!isAdmin()) return null;

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(translationKeys.admin.carousel.title, 'Advertisement Carousel')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t(translationKeys.admin.carousel.description, 'Manage home page carousel slides (max 9). First slide is always the logo.')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={openCreateDialog}
            disabled={atMaxSlides}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t(translationKeys.admin.carousel.addNew, 'Add slide')}
          </Button>
          {atMaxSlides && (
            <Card className="flex-1 border-border bg-muted/50">
              <CardContent className="py-3">
                <p className="text-sm font-medium text-foreground">
                  {t(translationKeys.admin.carousel.maxSlidesReached, 'Maximum slides reached')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(translationKeys.admin.carousel.maxSlidesReachedDescription, 'Maximum of 9 advertisement slides reached. Delete or edit an existing slide to add a new one.')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(translationKeys.admin.carousel.loading, 'Loading carousel...')}
          </CardContent>
        </Card>
      ) : slides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(translationKeys.admin.carousel.noSlides, 'No carousel slides yet. Add your first slide.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <Card key={slide.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t(translationKeys.admin.carousel.slideOrder, 'Slide')} {slide.order + 1}
                </CardTitle>
                {slide.link && (
                  <CardDescription className="truncate" title={slide.link}>
                    {slide.link}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                  <Image
                    src={slide.desktopUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(slide)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t(translationKeys.common.edit, 'Edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(slide.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t(translationKeys.admin.carousel.editTitle, 'Edit carousel slide')
                : t(translationKeys.admin.carousel.createTitle, 'Add carousel slide')}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? t(translationKeys.admin.carousel.editDescription, 'Update link and/or replace images.')
                : t(translationKeys.admin.carousel.createDescription, 'Upload images and set optional link. Desktop image is required; mobile is optional (desktop is used if not set).')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {t(translationKeys.admin.carousel.imageSizeHint, 'Best fit: 2.5:1 aspect ratio (e.g. 1250×500px desktop, 750×300px mobile). Formats: JPEG, PNG, WebP, AVIF.')}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="carousel-link">{t(translationKeys.admin.carousel.linkUrl, 'Link URL')}</Label>
              <Input
                id="carousel-link"
                type="url"
                placeholder={t(translationKeys.admin.carousel.linkUrlPlaceholder, 'https://... (optional)')}
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="carousel-desktop">
                {t(translationKeys.admin.carousel.desktopImage, 'Desktop image')}
                {!editingId && ' *'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="carousel-desktop"
                  ref={desktopInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => setDesktopFile(e.target.files?.[0] ?? null)}
                  className="absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none"
                />
                <Button
                  type="button"
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => desktopInputRef.current?.click()}
                >
                  {t(translationKeys.common.chooseFile, 'Choose file')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {desktopFile ? desktopFile.name : t(translationKeys.common.noFileChosen, 'No file chosen')}
                </span>
              </div>
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  {t(translationKeys.admin.carousel.editDescription, 'Leave empty to keep current image.')}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="carousel-mobile">{t(translationKeys.admin.carousel.mobileImage, 'Mobile image')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="carousel-mobile"
                  ref={mobileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => setMobileFile(e.target.files?.[0] ?? null)}
                  className="absolute opacity-0 w-0 h-0 overflow-hidden pointer-events-none"
                />
                <Button
                  type="button"
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => mobileInputRef.current?.click()}
                >
                  {t(translationKeys.common.chooseFile, 'Choose file')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {mobileFile ? mobileFile.name : t(translationKeys.common.noFileChosen, 'No file chosen')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(translationKeys.admin.carousel.mobileImageOptional, 'Optional. If not set, desktop image is shown on mobile.')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t(translationKeys.common.cancel, 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                createSlide.isPending ||
                updateSlide.isPending ||
                (!editingId && !desktopFile) ||
                (!!editingId && !desktopFile && !mobileFile && link === (slides.find((s) => s.id === editingId)?.link || ''))
              }
            >
              {editingId
                ? t(translationKeys.common.update, 'Update')
                : t(translationKeys.common.create, 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
