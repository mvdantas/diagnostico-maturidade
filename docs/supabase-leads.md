# Supabase leads schema

Este documento descreve a tabela principal de leads do Diagnóstico de Maturidade Digital.

A implementação desta etapa cobre apenas o desenho do banco e variáveis necessárias. Ela não altera o formulário, não envia e-mails e não integra HubSpot.

## Tabela

Tabela: `public.diagnostic_leads`

## Campos

| Campo | Tipo | Obrigatório no payload | Descrição |
|---|---|---:|---|
| `id` | `uuid` | Não | Identificador único do lead. Gerado automaticamente. |
| `created_at` | `timestamptz` | Não | Data e hora de criação do registro. Gerado automaticamente. |
| `updated_at` | `timestamptz` | Não | Data e hora da última atualização. Atualizado por trigger. |
| `source` | `text` | Não | Origem do lead. Padrão: `diagnostico-maturidade-digital`. |
| `campaign` | `text` | Não | Campanha relacionada. Padrão: `onda-01-ia-saude`. |
| `page_url` | `text` | Não | URL da página no momento do envio. |
| `referrer` | `text` | Não | Página de origem informada pelo navegador. |
| `name` | `text` | Sim | Nome completo informado no formulário. |
| `email` | `text` | Sim | E-mail informado no formulário. |
| `whatsapp` | `text` | Sim | WhatsApp informado no formulário. |
| `city` | `text` | Sim | Cidade informada no formulário. |
| `specialty` | `text` | Sim | Especialidade ou área de atuação informada no formulário. |
| `final_score` | `integer` | Sim | Nota final percentual do diagnóstico, entre 0 e 100. |
| `total_got` | `integer` | Não | Total de pontos obtidos no diagnóstico. |
| `total_max` | `integer` | Não | Pontuação máxima possível. |
| `maturity_stage_label` | `text` | Sim | Nome do estágio de maturidade retornado pelo diagnóstico. |
| `maturity_stage_min` | `integer` | Não | Limite inferior da faixa do estágio. |
| `maturity_stage_max` | `integer` | Não | Limite superior da faixa do estágio. |
| `dimension_scores` | `jsonb` | Sim | Resultado por dimensão/domínio do diagnóstico. |
| `answers` | `jsonb` | Sim | Respostas brutas do usuário. |
| `utm_source` | `text` | Não | UTM source. |
| `utm_medium` | `text` | Não | UTM medium. |
| `utm_campaign` | `text` | Não | UTM campaign. |
| `utm_term` | `text` | Não | UTM term. |
| `utm_content` | `text` | Não | UTM content. |
| `utm_id` | `text` | Não | UTM id. |
| `lgpd_consent` | `boolean` | Sim | Indica se o usuário aceitou o consentimento LGPD. |
| `lgpd_consent_text` | `text` | Não | Texto do consentimento apresentado ao usuário. |
| `lgpd_consent_version` | `text` | Não | Versão do texto de consentimento. |
| `lgpd_consent_at` | `timestamptz` | Não | Data e hora do aceite. |
| `privacy_policy_url` | `text` | Não | URL da política de privacidade, se houver. |
| `marketing_consent` | `boolean` | Não | Indica aceite para comunicações de marketing. Padrão: `false`. |
| `marketing_consent_at` | `timestamptz` | Não | Data e hora do aceite de marketing, se houver. |
| `user_agent` | `text` | Não | User-Agent da requisição. |
| `ip_hash` | `text` | Não | Hash do IP para auditoria sem armazenar IP puro. |
| `wants_consulting` | `boolean` | Não | Indica se o lead pediu consultoria. Padrão: `false`. |
| `lead_status` | `text` | Não | Status comercial do lead. Padrão: `new`. |
| `hubspot_status` | `text` | Não | Status futuro da integração HubSpot. Padrão: `not_sent`. |
| `hubspot_contact_id` | `text` | Não | ID futuro do contato no HubSpot. |
| `hubspot_last_error` | `text` | Não | Último erro futuro da integração HubSpot. |
| `resend_status` | `text` | Não | Status futuro da integração Resend. Padrão: `not_sent`. |
| `resend_last_error` | `text` | Não | Último erro futuro da integração Resend. |

## Campos obrigatórios no payload

- `name`
- `email`
- `whatsapp`
- `city`
- `specialty`
- `final_score`
- `maturity_stage_label`
- `dimension_scores`
- `answers`
- `lgpd_consent`

## Segurança

A tabela tem RLS ativado e não cria políticas públicas.

A gravação deve ser feita apenas por rota backend da Vercel usando `SUPABASE_SERVICE_ROLE_KEY`. Essa chave nunca deve ser exposta no navegador.

## Arquivo SQL

O esquema está em:

```text
supabase/migrations/20260628_create_diagnostic_leads.sql
```
