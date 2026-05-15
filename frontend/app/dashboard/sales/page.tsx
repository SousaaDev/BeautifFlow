'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  DollarSign,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuth } from '@/contexts/auth-context'
import { salesApi } from '@/lib/api/sales'
import { customersApi } from '@/lib/api/customers'
import { professionalsApi } from '@/lib/api/professionals'
import { servicesApi } from '@/lib/api/services'
import { productsApi } from '@/lib/api/products'
import type { Sale, SaleItem, Customer, Professional, Service, Product, PaymentMethod } from '@/lib/types'

import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const saleItemSchema = z.object({
  type: z.enum(['product', 'service']),
  itemId: z.string().min(1, 'Selecione um item'),
  quantity: z.coerce.number().min(1, 'Quantidade minima: 1'),
  unitPrice: z.coerce.number().min(0),
})

const saleSchema = z.object({
  customerId: z.string().optional(),
  professionalId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Adicione pelo menos um item'),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'OTHER']),
  notes: z.string().optional(),
})

type SaleFormData = z.infer<typeof saleSchema>

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartao de Credito',
  DEBIT_CARD: 'Cartao de Debito',
  PIX: 'PIX',
  OTHER: 'Outro',
}

export default function SalesPage() {
  const { tenant } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      items: [{ type: 'service', itemId: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      paymentMethod: 'CASH',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchItems = watch('items')
  const watchDiscount = watch('discount')

  const subtotal = watchItems.reduce((acc, item) => {
    return acc + (item.unitPrice || 0) * (item.quantity || 0)
  }, 0)

  const total = Math.max(0, subtotal - (watchDiscount || 0))

  const getSaleTotalAmount = (sale: Sale) => sale.totalAmount ?? sale.total ?? 0
  const getSaleFinalAmount = (sale: Sale) => sale.finalAmount ?? sale.total ?? getSaleTotalAmount(sale)
  const getSalePaymentStatus = (sale: Sale) => sale.paymentStatus ?? 'PAID'
  const getSaleItemTotalPrice = (item: SaleItem) => item.totalPrice ?? item.unitPrice * item.quantity

  useEffect(() => {
    if (tenant?.id) {
      loadData()
    }
  }, [tenant?.id])

  const loadData = async () => {
    if (!tenant?.id) return
    setIsLoading(true)
    try {
      const [salesData, custsData, profsData, servsData, prodsData] = await Promise.all([
        salesApi.list(tenant.id),
        customersApi.list(tenant.id),
        professionalsApi.list(tenant.id),
        servicesApi.list(tenant.id),
        productsApi.list(tenant.id),
      ])
      setSales(salesData)
      setCustomers(custsData)
      setProfessionals(profsData)
      setServices(servsData.filter((s) => s.isActive))
      setProducts(prodsData.filter((p) => p.isActive && p.currentStock > 0))
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    reset({
      customerId: '',
      professionalId: '',
      items: [{ type: 'service', itemId: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      paymentMethod: 'CASH',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const openViewDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setIsViewDialogOpen(true)
  }

  const onSubmit = async (data: SaleFormData) => {
    if (!tenant?.id) return
    setIsSubmitting(true)

    try {
      const payload = {
        customerId: data.customerId || undefined,
        professionalId: data.professionalId || undefined,
        items: data.items.map((item) => ({
          productId: item.type === 'product' ? item.itemId : undefined,
          serviceId: item.type === 'service' ? item.itemId : undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        discount: data.discount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      }

      await salesApi.create(tenant.id, payload)
      toast.success('Venda registrada com sucesso')
      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao registrar venda'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleItemChange = (index: number, itemId: string, type: 'product' | 'service') => {
    if (type === 'service') {
      const service = services.find((s) => s.id === itemId)
      if (service) {
        setValue(`items.${index}.unitPrice`, service.price)
      }
    } else {
      const product = products.find((p) => p.id === itemId)
      if (product) {
        setValue(`items.${index}.unitPrice`, product.salePrice)
      }
    }
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Data',
      render: (s: Sale) => (
        <div>
          <p className="font-medium">{format(new Date(s.createdAt), 'dd/MM/yyyy')}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(s.createdAt), 'HH:mm')}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (s: Sale) => s.customer?.name || 'Cliente avulso',
    },
    {
      key: 'items',
      header: 'Itens',
      render: (s: Sale) => (
        <span>{s.items?.length || 0} item(s)</span>
      ),
    },
    {
      key: 'finalAmount',
      header: 'Total',
      render: (s: Sale) => (
        <span className="font-medium">R$ {getSaleFinalAmount(s).toFixed(2)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Pagamento',
      render: (s: Sale) => paymentMethodLabels[s.paymentMethod],
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      render: (s: Sale) => {
        const status = getSalePaymentStatus(s)
        return (
          <Badge variant={status === 'PAID' ? 'default' : 'secondary'}>
            {status === 'PAID' && 'Pago'}
            {status === 'PENDING' && 'Pendente'}
            {status === 'REFUNDED' && 'Reembolsado'}
            {status === 'CANCELED' && 'Cancelado'}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (s: Sale) => (
        <Button variant="ghost" size="icon" onClick={() => openViewDialog(s)}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ]

  // Stats
  const totalRevenue = sales
    .filter((s) => getSalePaymentStatus(s) === 'PAID')
    .reduce((acc, s) => acc + getSaleFinalAmount(s), 0)

  const todaySales = sales.filter((s) => {
    const today = new Date()
    const saleDate = new Date(s.createdAt)
    return (
      saleDate.getDate() === today.getDate() &&
      saleDate.getMonth() === today.getMonth() &&
      saleDate.getFullYear() === today.getFullYear()
    )
  })

  const todayRevenue = todaySales
    .filter((s) => getSalePaymentStatus(s) === 'PAID')
    .reduce((acc, s) => acc + getSaleFinalAmount(s), 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">
            Registre e acompanhe as vendas do seu salao
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <DollarSign className="w-4 h-4" />
          Nova venda
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todaySales.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ {todayRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total do periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={sales}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar vendas..."
        onAdd={openCreateDialog}
        addLabel="Nova venda"
        emptyMessage="Nenhuma venda registrada"
        emptyIcon={<ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/50" />}
        getRowKey={(s) => s.id}
      />

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova venda</DialogTitle>
            <DialogDescription>
              Registre uma nova venda de produtos ou servicos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cliente avulso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Cliente avulso</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Profissional (opcional)</Label>
                <Controller
                  name="professionalId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Itens da venda</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ type: 'service', itemId: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar item
                </Button>
              </div>

              {errors.items && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <Label className="text-xs">Tipo</Label>
                    <Controller
                      name={`items.${index}.type`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v)
                            setValue(`items.${index}.itemId`, '')
                            setValue(`items.${index}.unitPrice`, 0)
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="service">Servico</SelectItem>
                            <SelectItem value="product">Produto</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="col-span-4">
                    <Label className="text-xs">Item</Label>
                    <Controller
                      name={`items.${index}.itemId`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v)
                            handleItemChange(index, v, watchItems[index]?.type || 'service')
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {watchItems[index]?.type === 'service'
                              ? services.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} - R$ {s.price.toFixed(2)}
                                  </SelectItem>
                                ))
                              : products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} - R$ {p.salePrice.toFixed(2)} (est: {p.currentStock})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`)}
                    />
                  </div>

                  <div className="col-span-3">
                    <Label className="text-xs">Preco unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unitPrice`)}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de pagamento *</Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Dinheiro</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartao de Credito</SelectItem>
                        <SelectItem value="DEBIT_CARD">Cartao de Debito</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('discount')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                placeholder="Anotacoes sobre a venda..."
                {...register('notes')}
              />
            </div>

            {/* Totals */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {watchDiscount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Desconto</span>
                    <span>- R$ {watchDiscount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

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
                Registrar venda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da venda</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.createdAt), "dd/MM/yyyy 'as' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedSale.customer?.name || 'Cliente avulso'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profissional</p>
                  <p className="font-medium">{selectedSale.professional?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagamento</p>
                  <p className="font-medium">{paymentMethodLabels[selectedSale.paymentMethod]}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Itens</p>
                <div className="space-y-2">
                  {selectedSale.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.product?.name || item.service?.name || 'Item'}
                      </span>
                      <span>R$ {getSaleItemTotalPrice(item).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {getSaleTotalAmount(selectedSale).toFixed(2)}</span>
                </div>
                {(selectedSale.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Desconto</span>
                    <span>- R$ {(selectedSale.discount ?? 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total</span>
                  <span>R$ {getSaleFinalAmount(selectedSale).toFixed(2)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-sm">Observacoes</p>
                    <p className="text-sm">{selectedSale.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
