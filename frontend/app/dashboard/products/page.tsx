'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Package, MoreHorizontal, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { productsApi } from '@/lib/api/products'
import type { Product } from '@/lib/types'

import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preco deve ser maior ou igual a zero'),
  costPrice: z.coerce.number().min(0, 'Custo deve ser maior ou igual a zero').optional(),
  stock: z.coerce.number().int().min(0, 'Estoque deve ser maior ou igual a zero'),
  minStock: z.coerce.number().int().min(0, 'Estoque minimo deve ser maior ou igual a zero'),
  isActive: z.boolean().optional().default(true),
})

type ProductFormData = z.infer<typeof productSchema>

export default function ProductsPage() {
  const { tenant } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { isActive: true, stock: 0, minStock: 5 },
  })

  const isActive = watch('isActive')

  useEffect(() => {
    if (tenant?.id) {
      loadProducts()
    }
  }, [tenant?.id])

  const loadProducts = async () => {
    if (!tenant?.id) return
    try {
      const data = await productsApi.list(tenant.id)
      setProducts(data)
    } catch (error) {
      toast.error('Erro ao carregar produtos')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setSelectedProduct(null)
    reset({ name: '', description: '', price: 0, costPrice: 0, stock: 0, minStock: 5, isActive: true })
    setIsDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product)
    reset({
      name: product.name,
      description: product.description || '',
      price: product.salePrice,
      costPrice: product.costPrice || 0,
      stock: product.currentStock,
      minStock: product.minThreshold,
      isActive: product.isActive,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = async (data: ProductFormData) => {
    if (!tenant?.id) return
    setIsSubmitting(true)

    try {
      if (selectedProduct) {
        await productsApi.update(tenant.id, selectedProduct.id, data)
        toast.success('Produto atualizado com sucesso')
      } else {
        await productsApi.create(tenant.id, data)
        toast.success('Produto criado com sucesso')
      }
      setIsDialogOpen(false)
      loadProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar produto'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tenant?.id || !selectedProduct) return
    setIsSubmitting(true)

    try {
      await productsApi.delete(tenant.id, selectedProduct.id)
      toast.success('Produto removido com sucesso')
      setIsDeleteDialogOpen(false)
      loadProducts()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover produto'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const lowStockProducts = products.filter((p) => p.currentStock <= p.minThreshold && p.isActive)

  const columns = [
    {
      key: 'name',
      header: 'Produto',
      render: (p: Product) => (
        <div>
          <p className="font-medium">{p.name}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Estoque',
      render: (p: Product) => (
        <div className="flex items-center gap-2">
          <span className={p.currentStock <= p.minThreshold ? 'text-destructive font-medium' : ''}>
            {p.currentStock}
          </span>
          {p.currentStock <= p.minThreshold && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Preco',
      render: (p: Product) => (
        <span className="font-medium">R$ {(Number(p.salePrice) || 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'profit',
      header: 'Margem',
      render: (p: Product) => {
        const price = Number(p.salePrice) || 0
        const cost = Number(p.costPrice) || 0
        if (!cost || !price) return '-'
        const margin = ((price - cost) / price) * 100
        return (
          <span className={margin >= 30 ? 'text-green-600' : 'text-yellow-600'}>
            {margin.toFixed(0)}%
          </span>
        )
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p: Product) => (
        <Badge variant={p.isActive ? 'default' : 'secondary'}>
          {p.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (p: Product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(p)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(p)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie o estoque de produtos do seu salao
        </p>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">Estoque baixo</p>
            <p className="text-sm text-muted-foreground">
              {lowStockProducts.length} produto(s) com estoque abaixo do minimo:{' '}
              {lowStockProducts.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <DataTable
        data={products}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar produtos..."
        onAdd={openCreateDialog}
        addLabel="Novo produto"
        emptyMessage="Nenhum produto cadastrado"
        emptyIcon={<Package className="w-12 h-12 mx-auto text-muted-foreground/50" />}
        getRowKey={(p) => p.id}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'Editar produto' : 'Novo produto'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? 'Atualize os dados do produto'
                : 'Adicione um novo produto ao estoque'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" placeholder="Ex: Shampoo Profissional" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descricao do produto..."
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preco de venda (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price')}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPrice">Preco de custo (R$)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('costPrice')}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  {...register('stock')}
                />
                {errors.stock && (
                  <p className="text-sm text-destructive">{errors.stock.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Estoque minimo *</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  {...register('minStock')}
                />
              </div>

            </div>

            {selectedProduct && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Produto ativo</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedProduct ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedProduct?.name}? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
