"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { CheckCircle2, UserPlus } from "lucide-react"

const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
]

interface FormData {
  name: string
  age: string
  position: string
  number: string
}

interface FormErrors {
  name?: string
  age?: string
  position?: string
  number?: string
}

export function AddPlayerForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    age: "",
    position: "",
    number: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Please enter the player's name"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "The player's name must be at least 2 characters long"
    }

    const age = parseInt(formData.age)
    if (!formData.age) {
      newErrors.age = "Please enter the player's age"
    } else if (isNaN(age) || age < 15 || age > 50) {
      newErrors.age = "Age must be a number between 15 and 50"
    }

    if (!formData.position) {
      newErrors.position = "Please select the player's position"
    }

    const number = parseInt(formData.number)
    if (!formData.number) {
      newErrors.number = "Please enter the player's jersey number"
    } else if (isNaN(number) || number < 1 || number > 99) {
      newErrors.number = "Jersey number must be between 1 and 99"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    console.log("Player added:", formData)
    setIsSubmitting(false)
    setIsSuccess(true)

    // Reset form after showing success
    setTimeout(() => {
      setFormData({ name: "", age: "", position: "", number: "" })
      setIsSuccess(false)
    }, 2500)
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Player Added Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.name} has been added to the roster
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Add New Player</CardTitle>
            <CardDescription>Enter the player details below</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Enter player name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="age">Age</FieldLabel>
              <Input
                id="age"
                type="number"
                placeholder="Enter age"
                min={15}
                max={50}
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                className={errors.age ? "border-destructive" : ""}
              />
              {errors.age && <FieldError>{errors.age}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="position">Position</FieldLabel>
              <Select
                value={formData.position}
                onValueChange={(value) => handleInputChange("position", value)}
              >
                <SelectTrigger 
                  id="position"
                  className={errors.position ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.position && <FieldError>{errors.position}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="number">Jersey Number</FieldLabel>
              <Input
                id="number"
                type="number"
                placeholder="Enter jersey number"
                min={1}
                max={99}
                value={formData.number}
                onChange={(e) => handleInputChange("number", e.target.value)}
                className={errors.number ? "border-destructive" : ""}
              />
              {errors.number && <FieldError>{errors.number}</FieldError>}
            </Field>

            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Adding Player...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Player
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
