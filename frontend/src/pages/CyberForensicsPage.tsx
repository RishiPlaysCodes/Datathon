import { useState } from 'react'
import { Fingerprint, Shield, AlertTriangle, Search, ArrowRight, CheckCircle } from 'lucide-react'

const ATTACK_METHODS = {
  'phishing': {
    name: 'Phishing Attack',
    description: 'Victim received fraudulent email/SMS impersonating bank/service',
    steps: [
      'Attacker sends phishing email/SMS with fake link mimicking trusted service',
      'Victim clicks link → lands on fake website identical to real one',
      'Victim enters credentials (username, password, OTP)',
      'Attacker captures credentials in real-time',
      'Attacker uses credentials to access real account',
      'Money transferred to mule accounts within minutes',
    ],
    forensics: [
      'Trace phishing URL domain registration (WHOIS lookup)',
      'Check email headers for originating IP address',
      'Analyze URL shortener logs if used',
      'Request bank transaction logs with IP/device info',
      'Check if same phishing domain used in other complaints',
    ],
    evidence: ['Email/SMS screenshot', 'URL of phishing site', 'Transaction receipts', 'Bank statement', 'Device logs'],
    laws: ['IT Act Sec 66C (Identity theft)', 'IT Act Sec 66D (Cheating by personation)', 'BNS 318 (Cheating)'],
  },
  'sim_swap': {
    name: 'SIM Swap Fraud',
    description: 'Attacker obtained duplicate SIM of victim\'s number to intercept OTPs',
    steps: [
      'Attacker collects victim\'s personal info (social engineering/data breach)',
      'Attacker visits telecom outlet with fake ID claiming SIM lost',
      'New SIM issued → victim\'s original SIM deactivated',
      'Attacker receives all OTPs on new SIM',
      'Bank accounts accessed using intercepted OTPs',
      'Money transferred before victim realizes SIM is dead',
    ],
    forensics: [
      'Get SIM swap request records from telecom operator',
      'Identify which outlet issued duplicate SIM',
      'Obtain CCTV of person who collected SIM',
      'Check ID documents submitted (likely forged)',
      'Trace money flow from victim account',
      'Check if same mule accounts used in other SIM swap cases',
    ],
    evidence: ['Telecom SIM swap records', 'Outlet CCTV footage', 'Fake ID used', 'Bank transaction logs', 'Cell tower location data'],
    laws: ['IT Act Sec 66C', 'IT Act Sec 43', 'BNS 318/319', 'Telegraph Act violation'],
  },
  'upi_fraud': {
    name: 'UPI/Payment Fraud',
    description: 'Victim tricked into sending money or sharing UPI PIN via social engineering',
    steps: [
      'Attacker contacts victim (call/WhatsApp) posing as customer care / buyer',
      'Creates urgency: "Your account will be blocked" or "I\'m sending payment"',
      'Sends COLLECT REQUEST instead of payment (victim thinks they\'re receiving)',
      'Victim enters UPI PIN thinking they\'re receiving money',
      'Money debited from victim\'s account instantly',
      'Attacker immediately transfers to another account/withdraws',
    ],
    forensics: [
      'Get UPI transaction ID and trace through NPCI',
      'Identify beneficiary UPI ID and linked bank account',
      'Request CDR of attacker\'s phone number',
      'Check if same UPI ID flagged in other complaints',
      'Analyze WhatsApp chat/call logs (if available)',
      'Check for KYC details of beneficiary account',
    ],
    evidence: ['UPI transaction screenshot', 'Phone number of caller', 'WhatsApp chat', 'Bank statement', 'Call recording if any'],
    laws: ['IT Act Sec 66D', 'BNS 318 (Cheating)', 'BNS 319 (Cheating by personation)', 'RBI circular violations'],
  },
  'ransomware': {
    name: 'Ransomware Attack',
    description: 'System/data encrypted by malware, ransom demanded for decryption key',
    steps: [
      'Malware delivered via email attachment / compromised website / RDP exploit',
      'Payload executes → encrypts all files with strong encryption',
      'Ransom note displayed demanding cryptocurrency payment',
      'Attacker threatens to publish data if ransom not paid',
      'Payment made (if any) → key may or may not be provided',
    ],
    forensics: [
      'Preserve infected system image (do NOT format)',
      'Identify ransomware variant from ransom note / encrypted file extension',
      'Check for decryption tools (NoMoreRansom.org)',
      'Analyze email that delivered payload',
      'Trace cryptocurrency wallet address',
      'Check network logs for C2 (command & control) communication',
    ],
    evidence: ['Ransom note screenshot', 'Encrypted file samples', 'Email with attachment', 'Network logs', 'Crypto wallet address'],
    laws: ['IT Act Sec 66 (Computer related offenses)', 'IT Act Sec 43 (Damage to computer)', 'BNS 303 (Extortion)', 'IT Act Sec 70 (if govt system)'],
  },
  'social_media_hack': {
    name: 'Social Media Account Hack',
    description: 'Account taken over for extortion, impersonation, or harassment',
    steps: [
      'Attacker obtains credentials (phishing / password reuse / brute force)',
      'Changes password and recovery email/phone',
      'Accesses private messages, photos, contacts',
      'Uses account to: demand ransom / harass / impersonate / scam contacts',
      'Victim locked out, unable to recover',
    ],
    forensics: [
      'Request login activity logs from platform (IP addresses, devices)',
      'Identify location of unauthorized logins',
      'Check if credential found in known data breaches (HaveIBeenPwned)',
      'Analyze any messages sent by attacker from victim\'s account',
      'Request platform to preserve account data',
    ],
    evidence: ['Login activity screenshot', 'Messages sent by attacker', 'Platform support communication', 'Recovery attempts log'],
    laws: ['IT Act Sec 66C (Identity theft)', 'IT Act Sec 66E (Privacy violation)', 'BNS 351 (Criminal intimidation)'],
  },
}

export function CyberForensicsPage() {
  const [selectedAttack, setSelectedAttack] = useState<string | null>(null)
  const [complaintText, setComplaintText] = useState('')
  const [detected, setDetected] = useState<string | null>(null)

  const detectAttackType = () => {
    const text = complaintText.toLowerCase()
    if (text.includes('phishing') || text.includes('fake link') || text.includes('fake website') || text.includes('email')) {
      setDetected('phishing')
    } else if (text.includes('sim') || text.includes('sim swap') || text.includes('network gone')) {
      setDetected('sim_swap')
    } else if (text.includes('upi') || text.includes('google pay') || text.includes('phonepe') || text.includes('collect request')) {
      setDetected('upi_fraud')
    } else if (text.includes('ransom') || text.includes('encrypted') || text.includes('bitcoin') || text.includes('locked files')) {
      setDetected('ransomware')
    } else if (text.includes('instagram') || text.includes('facebook') || text.includes('hacked') || text.includes('account')) {
      setDetected('social_media_hack')
    } else {
      setDetected('phishing') // Default
    }
    setSelectedAttack(detected || 'phishing')
  }

  const attack = selectedAttack ? ATTACK_METHODS[selectedAttack as keyof typeof ATTACK_METHODS] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Fingerprint className="w-6 h-6 text-primary-400" />
          Cyber Crime Forensics
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Attack method detection, forensic analysis, and investigation guidance
        </p>
      </div>

      {/* Auto-detect from complaint */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Paste Cyber Crime Complaint</h3>
        <textarea
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          placeholder="Paste the victim's complaint here... AI will auto-detect the attack method and provide forensic guidance"
          className="input-field w-full h-24 resize-none"
        />
        <button onClick={detectAttackType} className="btn-primary mt-3">
          <Search className="w-4 h-4 inline mr-2" /> Detect Attack Method
        </button>
      </div>

      {/* Attack Type Selection */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Or Select Attack Type</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ATTACK_METHODS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedAttack(key)}
              className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                selectedAttack === key
                  ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                  : 'border-dark-600 bg-dark-800 text-gray-300 hover:border-primary-500/50'
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>
      </div>

      {/* Forensic Analysis */}
      {attack && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attack Method Breakdown */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-red-400 mb-1">{attack.name}</h4>
            <p className="text-xs text-gray-400 mb-4">{attack.description}</p>

            <h5 className="text-xs font-semibold text-gray-300 mb-2">How The Attack Happened (Step by Step):</h5>
            <div className="space-y-2">
              {attack.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-gray-300">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-dark-700/30">
              <h5 className="text-xs font-semibold text-gray-300 mb-2">Applicable Laws:</h5>
              <div className="flex flex-wrap gap-1.5">
                {attack.laws.map((law, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-1 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    {law}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Forensic Steps + Evidence */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Forensic Investigation Steps
              </h4>
              <div className="space-y-2">
                {attack.forensics.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded bg-dark-800/50">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Evidence to Collect
              </h4>
              <div className="flex flex-wrap gap-2">
                {attack.evidence.map((ev, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                    📎 {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
