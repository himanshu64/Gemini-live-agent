{{/*
Expand the name of the chart.
*/}}
{{- define "sightline.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "sightline.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sightline.labels" -}}
helm.sh/chart: {{ include "sightline.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "sightline.name" . }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "sightline.backend.labels" -}}
{{ include "sightline.labels" . }}
app.kubernetes.io/name: {{ include "sightline.name" . }}-backend
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "sightline.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sightline.name" . }}-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "sightline.frontend.labels" -}}
{{ include "sightline.labels" . }}
app.kubernetes.io/name: {{ include "sightline.name" . }}-frontend
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "sightline.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sightline.name" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service account name
*/}}
{{- define "sightline.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sightline.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image full path helper
*/}}
{{- define "sightline.image" -}}
{{- printf "%s/%s:%s" .registry .repository .tag }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "sightline.namespace" -}}
{{- default .Release.Namespace .Values.namespaceOverride }}
{{- end }}
