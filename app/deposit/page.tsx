"use client"

import type React from "react"

import { useState } from "react"
import { PageLayout } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Building2, Smartphone, DollarSign, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DepositFlowModal } from "@/components/deposit-flow-modal"

type PaymentMethod = "card" | "bank" | "paypal" | "crypto"

const paymentMethods = [
  { id: "card" as PaymentMethod, name: "Credit/Debit Card", icon: CreditCard, fee: "Free", time: "Instant" },
  { id: "bank" as PaymentMethod, name: "Bank Transfer", icon: Building2, fee: "Free", time: "1-3 days" },
  { id: "paypal" as PaymentMethod, name: "PayPal", icon: Smartphone, fee: "2.9%", time: "Instant" },
  { id: "crypto" as PaymentMethod, name: "Cryptocurrency", icon: DollarSign, fee: "Free", time: "15-30 min" },
]

const quickAmounts = [25, 50, 100, 250, 500, 1000]

export default function DepositPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card")
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsModalOpen(true)
  }

  const handleDepositSuccess = () => {
    setIsModalOpen(false)
    setAmount("")
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 2000)
  }

  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod)
   

  return (
    <PageLayout title="Deposit Funds">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
              <CardDescription>Select how you'd like to add funds to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
                      selectedMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <method.icon className="h-5 w-5 shrink-0 text-primary" />
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold">{method.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Fee: {method.fee} • {method.time}
                      </div>
                    </div>
                    {selectedMethod === method.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>

              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Deposit Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="10"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quick Select</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        type="button"
                        variant="outline"
                        onClick={() => setAmount(quickAmount.toString())}
                        className={cn(amount === quickAmount.toString() && "border-primary bg-primary/5")}
                      >
                        ${quickAmount}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedMethod === "card" && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        required
                        inputMode="numeric"
                        autoComplete="cc-number"
                        maxLength={16}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          required
                          autoComplete="cc-expiry"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="password"
                          autoComplete="cc-csc"
                          inputMode="numeric"
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedMethod === "bank" && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input id="accountNumber" placeholder="Enter account number" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input id="routingNumber" placeholder="Enter routing number" required />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isProcessing || isSuccess}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Deposit Successful!
                    </>
                  ) : (
                    `Deposit ${amount ? `$${amount}` : ""}`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum</span>
                <span className="font-semibold">$10.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maximum (Daily)</span>
                <span className="font-semibold">$10,000.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maximum (Monthly)</span>
                <span className="font-semibold">$50,000.00</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsible Gaming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Set deposit limits to help manage your spending.</p>
              <Button
                variant="link"
                className="h-auto p-0 text-primary"
                onClick={() => {/* navigate to limits page or open modal */ }}
              >
                Set My Limits
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Welcome Bonus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Get 100% match bonus on your first deposit up to $500!</p>
              <p className="text-xs text-muted-foreground">Terms and conditions apply</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <DepositFlowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={amount}
        method={selectedMethodData?.name || ""}
        onSuccess={handleDepositSuccess}
      />
    </PageLayout>
  )
}
