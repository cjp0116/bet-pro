"use client"

import type React from "react"

import { useState } from "react"
import { PageLayout } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Building2, Smartphone, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

type WithdrawalMethod = "card" | "bank" | "paypal"

const withdrawalMethods = [
  { id: "card" as WithdrawalMethod, name: "Credit/Debit Card", icon: CreditCard, fee: "Free", time: "1-3 days" },
  { id: "bank" as WithdrawalMethod, name: "Bank Transfer", icon: Building2, fee: "Free", time: "3-5 days" },
  { id: "paypal" as WithdrawalMethod, name: "PayPal", icon: Smartphone, fee: "2.9%", time: "1-2 days" },
]

const savedAccounts = [
  { id: "visa-4582", method: "card" as WithdrawalMethod, label: "Visa ending in 4582" },
  { id: "bank-7891", method: "bank" as WithdrawalMethod, label: "Bank Account ****7891" },
  { id: "paypal-main", method: "paypal" as WithdrawalMethod, label: "john@example.com" },
]

export default function WithdrawPage() {
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod>("card")
  const [selectedAccount, setSelectedAccount] = useState(savedAccounts[0].id)
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const availableBalance = 1250.0
  const maxAmount = Math.min(availableBalance, 5000)

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setIsSuccess(true)

    // Reset after success
    setTimeout(() => {
      setIsSuccess(false)
      setAmount("")
    }, 3000)
  }

  const filteredAccounts = savedAccounts.filter((acc) => acc.method === selectedMethod)

  return (
    <PageLayout title="Withdraw Funds">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
              <CardDescription>Withdraw your funds to your preferred payment method</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Available Balance: <span className="font-semibold">${availableBalance.toFixed(2)}</span>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Withdrawal Method</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {withdrawalMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id)
                        const firstAccount = savedAccounts.find((acc) => acc.method === method.id)
                        if (firstAccount) setSelectedAccount(firstAccount.id)
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
                        selectedMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      <method.icon className="h-5 w-5 shrink-0 text-primary" />
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-semibold">{method.name}</div>
                        <div className="text-xs text-muted-foreground">{method.time}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Account</Label>
                  <div className="grid gap-2">
                    {filteredAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedAccount(account.id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all",
                          selectedAccount === account.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50",
                        )}
                      >
                        <span className="font-medium">{account.label}</span>
                        {selectedAccount === account.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full bg-transparent">
                    Add New Account
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Withdrawal Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="20"
                      max={maxAmount}
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum: $20.00</span>
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance.toFixed(2))}
                      className="text-primary hover:underline"
                    >
                      Withdraw All
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Withdrawal Amount</span>
                    <span className="font-semibold">${amount || "0.00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-semibold">
                      {selectedMethod === "paypal" && amount
                        ? `$${(Number.parseFloat(amount) * 0.029).toFixed(2)}`
                        : "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-semibold">Total to Receive</span>
                    <span className="font-bold text-primary">
                      $
                      {amount
                        ? (
                          Number.parseFloat(amount) -
                          (selectedMethod === "paypal" ? Number.parseFloat(amount) * 0.029 : 0)
                        ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isProcessing || isSuccess}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Withdrawal Requested!
                    </>
                  ) : (
                    `Request Withdrawal`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum</span>
                <span className="font-semibold">$20.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maximum (Daily)</span>
                <span className="font-semibold">$5,000.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maximum (Monthly)</span>
                <span className="font-semibold">$25,000.00</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="space-y-1">
                  <div className="font-medium">$150.00</div>
                  <div className="text-xs text-muted-foreground">to Visa ****4582</div>
                </div>
                <div className="text-xs text-right">
                  <div className="text-accent">Pending</div>
                  <div className="text-muted-foreground">Dec 16</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/50">
            <CardHeader>
              <CardTitle className="text-base">Important Notice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Withdrawals are typically processed within the timeframe shown.</p>
              <p>Identity verification may be required for first-time withdrawals.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
