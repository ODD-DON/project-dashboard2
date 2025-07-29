"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Download, FileText, DollarSign, Trash2 } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface InvoiceProject {
  id: string
  title: string
  brand: string
  type: string
  description: string
  deadline: Date
  priority: number
  status: string
  created_at: Date
  files: any[]
  invoicePrice?: number
  addedToInvoiceAt?: Date
}

interface InvoiceManagerProps {
  invoiceProjects: { [brand: string]: InvoiceProject[] }
  setInvoiceProjects: React.Dispatch<React.SetStateAction<{ [brand: string]: InvoiceProject[] }>>
  onClearInvoiceHistory: (brand: string, count: number) => void
  exportedInvoices: { [brand: string]: any[] }
  setExportedInvoices: React.Dispatch<React.SetStateAction<{ [brand: string]: any[] }>>
  onDeleteProject: (brand: string, projectId: string, projectTitle: string) => void
}

const brandColors = {
  "Wami Live": "bg-purple-100 text-purple-800 border-purple-200",
  "Luck On Fourth": "bg-green-100 text-green-800 border-green-200",
  "The Hideout": "bg-orange-100 text-orange-800 border-orange-200",
}

const brandClients = {
  "Wami Live": "WAMI LIVE INC",
  "Luck On Fourth": "In And Out Gaming LLC",
  "The Hideout": "The Hideout Gaming LLC",
}

export function InvoiceManager({
  invoiceProjects,
  setInvoiceProjects,
  onClearInvoiceHistory,
  exportedInvoices,
  setExportedInvoices,
  onDeleteProject,
}: InvoiceManagerProps) {
  const [invoiceNumbers, setInvoiceNumbers] = useState<{ [brand: string]: number }>({
    "Wami Live": 1,
    "Luck On Fourth": 1,
    "The Hideout": 1,
  })
  const [loading, setLoading] = useState(true)
  const [clearDialog, setClearDialog] = useState({
    isOpen: false,
    type: null,
    count: 0,
    brand: "",
  })
  const [projectToDelete, setProjectToDelete] = useState<{ brand: string; projectId: string } | null>(null)

  // Load invoice data from database on component mount
  useEffect(() => {
    const loadInvoiceData = async () => {
      setLoading(true)
      try {
        // Load invoice projects from database
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoice_projects")
          .select("*")
          .order("added_to_invoice_at", { ascending: true })

        if (invoiceError) {
          console.error("Error loading invoice data:", invoiceError)
          toast.error("Failed to load invoice data")
          setLoading(false)
          return
        }

        // Group invoice projects by brand
        const groupedInvoiceData: { [brand: string]: InvoiceProject[] } = {
          "Wami Live": [],
          "Luck On Fourth": [],
          "The Hideout": [],
        }

        invoiceData?.forEach((item: any) => {
          const project: InvoiceProject = {
            id: item.project_id,
            title: item.title,
            brand: item.brand,
            type: item.type,
            description: item.description,
            deadline: new Date(item.deadline),
            priority: item.priority,
            status: item.status,
            created_at: new Date(item.created_at),
            files: item.files || [],
            invoicePrice: Number.parseFloat(item.invoice_price),
            addedToInvoiceAt: item.added_to_invoice_at ? new Date(item.added_to_invoice_at) : undefined,
          }

          if (groupedInvoiceData[item.brand]) {
            groupedInvoiceData[item.brand].push(project)
          }
        })

        setInvoiceProjects(groupedInvoiceData)

        // Load exported invoices from database
        const { data: exportedData, error: exportedError } = await supabase
          .from("exported_invoices")
          .select("*")
          .order("exported_at", { ascending: false })

        if (exportedError) {
          console.error("Error loading exported invoices:", exportedError)
          toast.error("Failed to load exported invoices")
          setLoading(false)
          return
        }

        // Group exported invoices by brand
        const groupedExportedData: { [brand: string]: any[] } = {
          "Wami Live": [],
          "Luck On Fourth": [],
          "The Hideout": [],
        }

        exportedData?.forEach((item: any) => {
          const invoice = {
            id: item.id,
            invoiceNumber: item.invoice_number,
            fileName: item.file_name,
            totalAmount: Number.parseFloat(item.total_amount),
            exportedAt: new Date(item.exported_at),
            isPaid: item.is_paid,
            projects: item.projects,
          }

          if (groupedExportedData[item.brand]) {
            groupedExportedData[item.brand].push(invoice)
          }
        })

        setExportedInvoices(groupedExportedData)

        // Load current invoice numbers from database
        const { data: countersData, error: countersError } = await supabase
          .from("invoice_counters")
          .select("brand, current_number")

        if (countersError) {
          console.error("Error loading invoice counters:", countersError)
          // Don't show error to user, just use defaults
        } else if (countersData) {
          const counters: { [brand: string]: number } = {
            "Wami Live": 1,
            "Luck On Fourth": 1,
            "The Hideout": 1,
          }

          countersData.forEach((counter: any) => {
            counters[counter.brand] = counter.current_number
          })

          setInvoiceNumbers(counters)
        }

        toast.success("Invoice data loaded from database!")
      } catch (error) {
        console.error("Error loading invoice data:", error)
        toast.error("Failed to load invoice data")
      } finally {
        setLoading(false)
      }
    }

    loadInvoiceData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice data...</p>
        </div>
      </div>
    )
  }

  const getBrandTotal = (brand: string) => {
    return invoiceProjects[brand]?.reduce((sum, project) => sum + (project.invoicePrice || 0), 0) || 0
  }

  const removeFromInvoice = async (brand: string, projectId: string) => {
    try {
      // Remove from database
      const { error } = await supabase.from("invoice_projects").delete().eq("project_id", projectId).eq("brand", brand)

      if (error) {
        console.error("Error removing from invoice:", error)
        toast.error("Failed to remove from invoice")
        return
      }

      // Update local state
      setInvoiceProjects((prev) => ({
        ...prev,
        [brand]: prev[brand].filter((p) => p.id !== projectId),
      }))

      toast.success("Project removed from invoice and database!")
    } catch (error) {
      console.error("Error removing from invoice:", error)
      toast.error("Failed to remove from invoice")
    }
  }

  const toggleInvoicePaid = async (brand: string, invoiceId: string) => {
    const newExportedInvoices = {
      ...exportedInvoices,
      [brand]: exportedInvoices[brand].map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, isPaid: !invoice.isPaid } : invoice,
      ),
    }

    setExportedInvoices(newExportedInvoices)

    // Save to database
    try {
      const { error } = await supabase
        .from("exported_invoices")
        .update({ is_paid: !exportedInvoices[brand].find((inv) => inv.id === invoiceId)?.isPaid })
        .eq("id", invoiceId)

      if (error) {
        console.error("Error updating invoice payment status:", error)
        toast.error("Failed to update payment status")
        return
      }

      toast.success("Invoice payment status updated and saved!")
    } catch (error) {
      console.error("Error updating invoice payment status:", error)
      toast.error("Failed to update payment status")
    }
  }

  const clearInvoiceHistory = async (brand: string) => {
    const invoiceCount = exportedInvoices[brand]?.length || 0

    if (invoiceCount === 0) {
      toast.error("No invoice history to clear")
      return
    }

    try {
      // Clear from database
      const { error } = await supabase.from("exported_invoices").delete().eq("brand", brand)

      if (error) {
        console.error("Error clearing invoice history:", error)
        toast.error("Failed to clear invoice history")
        return
      }

      // Update local state
      setExportedInvoices((prev) => ({
        ...prev,
        [brand]: [],
      }))

      toast.success(`Cleared ${invoiceCount} invoices from ${brand} history and database!`)
    } catch (error) {
      console.error("Error clearing invoice history:", error)
      toast.error("Failed to clear invoice history")
    }
  }

  const getNextInvoiceNumber = async (brand: string): Promise<number> => {
    try {
      // Use the database function to get and increment the invoice number atomically
      const { data, error } = await supabase.rpc("get_next_invoice_number", {
        brand_name: brand,
      })

      if (error) {
        console.error("Error getting next invoice number:", error)
        // Fallback to local state if database fails
        return invoiceNumbers[brand] || 1
      }

      return data || 1
    } catch (error) {
      console.error("Error getting next invoice number:", error)
      // Fallback to local state if database fails
      return invoiceNumbers[brand] || 1
    }
  }

  const generateInvoicePDF = async (brand: string) => {
    const projects = invoiceProjects[brand]
    if (!projects || projects.length === 0) {
      toast.error("No projects to invoice")
      return
    }

    try {
      // Get the next invoice number from database
      const invoiceNumber = await getNextInvoiceNumber(brand)
      const invoiceNumberString = invoiceNumber.toString().padStart(3, "0")

      const doc = new jsPDF()
      const currentDate = new Date()

      // Header
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("INVOICE", 20, 30)

      // Invoice details
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Invoice #: ${invoiceNumberString}`, 20, 45)
      doc.text(`Date: ${format(currentDate, "MM/dd/yyyy")}`, 20, 55)

      // From section - simplified
      doc.setFont("helvetica", "bold")
      doc.text("FROM:", 20, 75)
      doc.setFont("helvetica", "normal")
      doc.text("Julio Aleman", 20, 85)
      doc.text("Graphic Design Services", 20, 95)

      // To section
      doc.setFont("helvetica", "bold")
      doc.text("BILL TO:", 120, 75)
      doc.setFont("helvetica", "normal")
      doc.text(brandClients[brand as keyof typeof brandClients], 120, 85)

      // Projects table
      let yPos = 130
      doc.setFont("helvetica", "bold")
      doc.text("Description", 20, yPos)
      doc.text("Type", 100, yPos)
      doc.text("Amount", 150, yPos)

      // Table line
      doc.line(20, yPos + 5, 190, yPos + 5)
      yPos += 15

      doc.setFont("helvetica", "normal")
      let total = 0

      projects.forEach((project) => {
        const price = project.invoicePrice || 0
        total += price

        // Truncate long titles
        const title = project.title.length > 30 ? project.title.substring(0, 30) + "..." : project.title

        doc.text(title, 20, yPos)
        doc.text(project.type, 100, yPos)
        doc.text(`$${price.toFixed(2)}`, 150, yPos)
        yPos += 10

        // Add new page if needed
        if (yPos > 250) {
          doc.addPage()
          yPos = 30
        }
      })

      // Total
      yPos += 10
      doc.line(140, yPos, 190, yPos)
      yPos += 10
      doc.setFont("helvetica", "bold")
      doc.text(`TOTAL: $${total.toFixed(2)}`, 140, yPos)

      // Payment info only
      yPos += 30
      doc.setFont("helvetica", "bold")
      doc.text("PAYMENT INFORMATION:", 20, yPos)
      doc.setFont("helvetica", "normal")
      yPos += 10
      doc.text("Zelle: (630) 270-9307", 20, yPos)
      yPos += 10
      doc.text("PayPal: Julioaseves@gmail.com", 20, yPos)

      // Save PDF with new naming format
      const brandName = brand
        .replace(/\s+/g, "_")
        .replace("Luck_On_Fourth", "LUCK_ON_FOURTH")
        .replace("Wami_Live", "WAMI_LIVE")
        .replace("The_Hideout", "THE_HIDEOUT")
      const fileName = `${brandName}_Invoice_${format(currentDate, "M-dd-yy")}.pdf`

      // Track exported invoice
      const exportedInvoice = {
        id: Date.now().toString(),
        invoiceNumber: invoiceNumberString,
        fileName,
        totalAmount: total,
        exportedAt: currentDate,
        isPaid: false,
        projects: [...projects],
      }

      // Update exported invoices and save to database
      const newExportedInvoices = {
        ...exportedInvoices,
        [brand]: [...exportedInvoices[brand], exportedInvoice],
      }

      setExportedInvoices(newExportedInvoices)

      // Save to database
      const { error } = await supabase.from("exported_invoices").insert([
        {
          brand,
          invoice_number: exportedInvoice.invoiceNumber,
          file_name: exportedInvoice.fileName,
          total_amount: exportedInvoice.totalAmount,
          exported_at: exportedInvoice.exportedAt.toISOString(),
          is_paid: exportedInvoice.isPaid,
          projects: exportedInvoice.projects,
        },
      ])

      if (error) {
        console.error("Error saving exported invoice to database:", error)
        toast.error("Failed to save invoice to database")
        return
      }

      doc.save(fileName)

      // Update local invoice number state to reflect the new number
      setInvoiceNumbers((prev) => ({
        ...prev,
        [brand]: invoiceNumber + 1,
      }))

      // Clear invoice projects and save to database
      const clearedInvoiceProjects = {
        ...invoiceProjects,
        [brand]: [],
      }

      setInvoiceProjects(clearedInvoiceProjects)

      // Save cleared invoice projects to database
      const { error: clearError } = await supabase.from("invoice_projects").delete().eq("brand", brand)

      if (clearError) {
        console.error("Error clearing invoice projects from database:", clearError)
        toast.error("Failed to clear invoice projects from database")
        return
      }

      toast.success(`Invoice #${invoiceNumberString} exported as ${fileName} - Data saved to database!`)
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice")
    }
  }

  const handleDeleteInvoiceProject = (brand: string, projectId: string, projectTitle: string) => {
    setClearDialog({
      isOpen: true,
      type: "completed",
      count: 1,
      brand: `Remove "${projectTitle}" from ${brand} invoice`,
    })

    // Store the project info for deletion
    setProjectToDelete({ brand, projectId })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Manager</h2>
          <p className="text-gray-600">Manage and export invoices for completed projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(brandClients).map(([brand, client]) => {
          const projects = invoiceProjects[brand] || []
          const total = getBrandTotal(brand)
          const isOverThreshold = total >= 200

          return (
            <Card key={brand} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {brand}
                  </CardTitle>
                  <Badge variant="outline" className={brandColors[brand as keyof typeof brandColors]}>
                    {projects.length} projects
                  </Badge>
                </div>
                <CardDescription>{client}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Total Amount */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Total Amount</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${isOverThreshold ? "text-green-600" : "text-gray-900"}`}>
                      ${total.toFixed(2)}
                    </div>
                    {isOverThreshold && <div className="text-xs text-green-600">Ready to invoice</div>}
                  </div>
                </div>

                {/* Projects List */}
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No completed projects</p>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{project.title}</p>
                          <p className="text-xs text-gray-500">{project.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">${project.invoicePrice?.toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromInvoice(brand, project.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Export Button */}
                <Separator />
                <Button
                  onClick={() => generateInvoicePDF(brand)}
                  disabled={projects.length === 0}
                  className="w-full"
                  variant={isOverThreshold ? "default" : "outline"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Invoice PDF
                </Button>

                {/* Exported Invoices History */}
                {exportedInvoices[brand] && exportedInvoices[brand].length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Invoice History</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearInvoiceHistory(brand)}
                          className="text-red-600 hover:text-red-700 h-6 px-2"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      {exportedInvoices[brand].map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{invoice.fileName}</p>
                            <p className="text-xs text-gray-500">
                              #{invoice.invoiceNumber} • ${invoice.totalAmount.toFixed(2)} •{" "}
                              {format(invoice.exportedAt, "MMM dd, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant={invoice.isPaid ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleInvoicePaid(brand, invoice.id)}
                            className={invoice.isPaid ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {invoice.isPaid ? "Paid ✓" : "Mark Paid"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {projects.length > 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    Next invoice #: {invoiceNumbers[brand].toString().padStart(3, "0")}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
