"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { UserPlus } from "lucide-react"
import { playersApi } from "@/lib/api"
import { FormHeader, SubmitButton } from "./shared"
import { LogoInput } from "@/components/ui/logo-input"

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]

interface PlayerFormProps {
  onSuccess: (title: string, subtitle: string) => void
}

export function PlayerForm({ onSuccess }: PlayerFormProps) {
  const [formData, setFormData] = useState({ name: "", age: "", position: "", number: "", photo: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = "Please enter the player's name"
    else if (formData.name.trim().length < 2) e.name = "The player's name must be at least 2 characters long"
    const age = parseInt(formData.age)
    if (!formData.age) e.age = "Please enter the player's age"
    else if (isNaN(age) || age < 15 || age > 50) e.age = "Age must be a number between 15 and 50"
    if (!formData.position) e.position = "Please select the player's position"
    const number = parseInt(formData.number)
    if (!formData.number) e.number = "Please enter the player's jersey number"
    else if (isNaN(number) || number < 1 || number > 99) e.number = "Jersey number must be between 1 and 99"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await playersApi.create({
        name: formData.name,
        age: parseInt(formData.age),
        position: formData.position,
        number: parseInt(formData.number),
        photo: formData.photo,
        team_id: null,
      })
      onSuccess("Player Added Successfully", `${formData.name} has been added to the roster`)
      setFormData({ name: "", age: "", position: "", number: "", photo: "" })
    } catch {
      setErrors({ _global: "Something went wrong while saving the player. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormHeader icon={<UserPlus className="h-6 w-6 text-primary" />} title="Add New Player" description="Enter the player details below" />

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="player-name">Name</FieldLabel>
          <Input id="player-name" placeholder="Enter player name" value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""} />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="player-age">Age</FieldLabel>
          <Input id="player-age" type="number" placeholder="Enter age" min={15} max={50} value={formData.age}
            onChange={(e) => handleInputChange("age", e.target.value)}
            className={errors.age ? "border-destructive" : ""} />
          {errors.age && <FieldError>{errors.age}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="player-position">Position</FieldLabel>
          <Select value={formData.position} onValueChange={(v) => handleInputChange("position", v)}>
            <SelectTrigger id="player-position" className={errors.position ? "border-destructive" : ""}>
              <SelectValue placeholder="Select a position" />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.position && <FieldError>{errors.position}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="player-number">Jersey Number</FieldLabel>
          <Input id="player-number" type="number" placeholder="Enter jersey number" min={1} max={99} value={formData.number}
            onChange={(e) => handleInputChange("number", e.target.value)}
            className={errors.number ? "border-destructive" : ""} />
          {errors.number && <FieldError>{errors.number}</FieldError>}
        </Field>
        <Field>
          <FieldLabel>Photo (optional)</FieldLabel>
          <LogoInput
            value={formData.photo}
            onChange={(url) => handleInputChange("photo", url)}
            disabled={isSubmitting}
          />
        </Field>
        <SubmitButton isSubmitting={isSubmitting} icon={<UserPlus className="mr-2 h-4 w-4" />} label="Add Player" loadingLabel="Adding Player..." />
      </FieldGroup>
    </form>
  )
}
