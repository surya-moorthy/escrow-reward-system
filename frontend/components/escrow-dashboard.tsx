"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Lock,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Key,
  FileText,
  Activity,
  TrendingUp,
} from "lucide-react"

interface EscrowContract {
  id: string
  name: string
  totalValue: string
  status: "active" | "pending" | "emergency"
  participants: number
  timelock: string
  multisigRequired: number
  multisigTotal: number
  lastActivity: string
}

interface SecurityEvent {
  id: string
  type: "deposit" | "withdrawal" | "emergency" | "multisig"
  description: string
  timestamp: string
  status: "completed" | "pending" | "failed"
  txHash: string
}

const mockEscrowContracts: EscrowContract[] = [
  {
    id: "1",
    name: "SOL Staking Pool",
    totalValue: "$1,200,000",
    status: "active",
    participants: 847,
    timelock: "24 hours",
    multisigRequired: 3,
    multisigTotal: 5,
    lastActivity: "2 minutes ago",
  },
  {
    id: "2",
    name: "DeFi Token Pool",
    totalValue: "$890,000",
    status: "active",
    participants: 234,
    timelock: "48 hours",
    multisigRequired: 2,
    multisigTotal: 3,
    lastActivity: "15 minutes ago",
  },
  {
    id: "3",
    name: "Gaming Token Pool",
    totalValue: "$340,000",
    status: "pending",
    participants: 89,
    timelock: "72 hours",
    multisigRequired: 4,
    multisigTotal: 7,
    lastActivity: "1 hour ago",
  },
]

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: "1",
    type: "deposit",
    description: "User deposited 500 SOL to escrow",
    timestamp: "2 minutes ago",
    status: "completed",
    txHash: "5KJp...9mNx",
  },
  {
    id: "2",
    type: "multisig",
    description: "Multisig approval for withdrawal request",
    timestamp: "15 minutes ago",
    status: "pending",
    txHash: "7Lm2...4kPq",
  },
  {
    id: "3",
    type: "withdrawal",
    description: "Timelock withdrawal completed",
    timestamp: "1 hour ago",
    status: "completed",
    txHash: "9Rn8...2vWx",
  },
]

export function EscrowDashboard() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500"
      case "pending":
        return "bg-amber-500/10 text-amber-500"
      case "emergency":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "withdrawal":
        return <TrendingUp className="h-4 w-4 text-blue-500 rotate-180" />
      case "multisig":
        return <Users className="h-4 w-4 text-primary" />
      case "emergency":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const totalEscrowValue = mockEscrowContracts.reduce(
    (sum, contract) => sum + Number.parseFloat(contract.totalValue.replace(/[$,]/g, "")),
    0,
  )

  return (
    <div className="space-y-8">
      {/* Escrow Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Escrow Value</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalEscrowValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Secured in smart contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {mockEscrowContracts.filter((c) => c.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Level</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">High</div>
            <p className="text-xs text-muted-foreground">Multi-signature + Timelock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">99.9%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alert */}
      <Alert className="border-green-500/20 bg-green-500/5">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          All escrow contracts are operating normally. No security incidents detected in the last 30 days.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs defaultValue="contracts" className="w-full">
        <TabsList>
          <TabsTrigger value="contracts">Escrow Contracts</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="settings">Security Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          {mockEscrowContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{contract.name}</h3>
                      <p className="text-muted-foreground">Contract ID: {contract.id}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(contract.status)}>
                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="font-semibold text-foreground text-lg">{contract.totalValue}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Participants</p>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{contract.participants}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Timelock</p>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-foreground">{contract.timelock}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Multisig</p>
                    <div className="flex items-center space-x-1">
                      <Key className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {contract.multisigRequired}/{contract.multisigTotal}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                    <p className="font-semibold text-foreground">{contract.lastActivity}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="bg-transparent">
                    View Contract
                  </Button>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Security Audit
                  </Button>
                  {contract.status === "pending" && <Button size="sm">Approve Transaction</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Security Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockSecurityEvents.map((event) => (
                <div key={event.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                  <div className="flex-shrink-0">{getEventIcon(event.type)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{event.timestamp}</span>
                      <span>TX: {event.txHash}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      event.status === "completed"
                        ? "default"
                        : event.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {event.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Multisig Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Multi-Signature Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Withdrawal Threshold</span>
                      <Badge variant="secondary">3/5 signatures</Badge>
                    </div>
                    <Progress value={60} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Requires 3 out of 5 authorized signatures for withdrawals
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Emergency Actions</span>
                      <Badge variant="secondary">4/5 signatures</Badge>
                    </div>
                    <Progress value={80} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Requires 4 out of 5 signatures for emergency procedures
                    </p>
                  </Card>
                </div>
              </div>

              {/* Timelock Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Timelock Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">24 Hours</p>
                    <p className="text-xs text-muted-foreground">Standard withdrawals</p>
                  </Card>

                  <Card className="p-4 text-center">
                    <Clock className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="font-semibold">48 Hours</p>
                    <p className="text-xs text-muted-foreground">Large withdrawals</p>
                  </Card>

                  <Card className="p-4 text-center">
                    <Clock className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="font-semibold">72 Hours</p>
                    <p className="text-xs text-muted-foreground">Emergency procedures</p>
                  </Card>
                </div>
              </div>

              {/* Security Audit */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Security Audit Status</h3>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-semibold text-foreground">Latest Audit: Passed</p>
                        <p className="text-sm text-muted-foreground">Conducted by CertiK on March 15, 2024</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      View Report
                    </Button>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
