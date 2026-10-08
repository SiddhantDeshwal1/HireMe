/**
 * Resolves the official PNG logo for any company in HireMe.
 * Guarantees that Amazon, Google, Microsoft, Meta, Netflix, Rubrik, Uber, etc.
 * always map reliably to their official PNG assets located in /logos/
 */

export function getCompanyLogo(
  companyName: string = '',
  companyDomain: string = '',
  rawLogoUrl?: string | null
): string {
  const comp = (companyName || '').toLowerCase().trim();
  const dom = (companyDomain || '').toLowerCase().trim();

  if (
    comp.includes('amazon') ||
    comp.includes('aws') ||
    comp.includes('adci') ||
    comp.includes('asspl') ||
    comp.includes('adsipl') ||
    comp.includes('annapurna') ||
    comp.includes('pillpack') ||
    comp.includes('souq') ||
    dom.includes('amazon')
  ) {
    return '/logos/amazon.png';
  }

  if (comp.includes('google') || comp.includes('alphabet') || dom.includes('google')) {
    return '/logos/google.png';
  }

  if (comp.includes('microsoft') || dom.includes('microsoft')) {
    return '/logos/microsoft.png';
  }

  if (comp.includes('netflix') || dom.includes('netflix')) {
    return '/logos/netflix.png';
  }

  if (comp.includes('rubrik') || dom.includes('rubrik')) {
    return '/logos/rubrik.png';
  }

  if (comp.includes('uber') || dom.includes('uber')) {
    return '/logos/uber.png';
  }

  if (comp.includes('meta') || comp.includes('facebook') || dom.includes('metacareers')) {
    return '/logos/meta.png';
  }

  if (comp.includes('figma')) return '/logos/figma.png';
  if (comp.includes('stripe')) return '/logos/stripe.png';
  if (comp.includes('linear')) return '/logos/linear.png';
  if (comp.includes('supabase')) return '/logos/supabase.png';
  if (comp.includes('vercel')) return '/logos/vercel.png';

  if (rawLogoUrl && rawLogoUrl.startsWith('/logos/')) {
    return rawLogoUrl.replace(/\.svg$/, '.png');
  }

  const clean = comp.replace(/[^a-z0-9]/g, '');
  return clean ? `/logos/${clean}.png` : '/logos/amazon.png';
}

export function getCanonicalCompanyName(companyName: string = '', companyDomain: string = ''): string {
  const comp = (companyName || '').toLowerCase().trim();
  const dom = (companyDomain || '').toLowerCase().trim();

  if (
    comp.includes('amazon') ||
    comp.includes('aws') ||
    comp.includes('adci') ||
    comp.includes('asspl') ||
    comp.includes('adsipl') ||
    dom.includes('amazon')
  ) {
    return 'Amazon';
  }
  if (comp.includes('google') || comp.includes('alphabet') || dom.includes('google')) {
    return 'Google';
  }
  if (comp.includes('microsoft') || dom.includes('microsoft')) {
    return 'Microsoft';
  }
  if (comp.includes('netflix') || dom.includes('netflix')) {
    return 'Netflix';
  }
  if (comp.includes('rubrik') || dom.includes('rubrik')) {
    return 'Rubrik';
  }
  if (comp.includes('uber') || dom.includes('uber')) {
    return 'Uber';
  }
  if (comp.includes('meta') || comp.includes('facebook') || dom.includes('metacareers')) {
    return 'Meta';
  }
  return companyName || 'Company';
}
