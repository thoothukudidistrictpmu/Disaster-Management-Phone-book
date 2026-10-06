import React, { useState } from 'react';
import { ContactRecord } from '../types.ts';
import { Phone, MessageCircle, Copy, Check, MapPin, Building2, UserCheck, ShieldAlert } from 'lucide-react';
import { getCallLink, getWhatsAppLink, formatIndianMobileDisplay, cleanIndianMobile } from '../utils/phone.ts';

interface ContactResultsProps {
  contacts: ContactRecord[];
  taluk: string;
  department: string;
}

export const ContactResults: React.FC<ContactResultsProps> = ({
  contacts,
  taluk,
  department,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, phone: string) => {
    const clean = cleanIndianMobile(phone) || phone;
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 animate-fade-in">
      {/* Result header banner */}
      <div className="bg-white/90 backdrop-blur-md border border-sky-100 rounded-xl p-4 sm:p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
              Search Results
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900">
              {department} <span className="text-slate-400 font-normal">•</span> <span className="text-sky-700">{taluk} Taluk</span>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 bg-sky-50 text-sky-800 text-xs font-semibold rounded-full border border-sky-200">
          <span>{contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'} Found</span>
        </div>
      </div>

      {/* Desktop View: Clean Table */}
      <div className="hidden md:block bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-sky-50 via-slate-50 to-sky-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-sky-200">
                <th className="py-4 px-6">Location Type</th>
                <th className="py-4 px-6">Designation / Resource Type</th>
                <th className="py-4 px-6">Mobile No.</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {contacts.map((contact) => {
                const callHref = getCallLink(contact.mobileNo);
                const waHref = getWhatsAppLink(contact.mobileNo);
                const hasValidPhone = contact.isValidMobile || (contact.cleanMobile && contact.cleanMobile.length >= 7);

                return (
                  <tr
                    key={contact.id}
                    className="hover:bg-sky-50/50 transition-colors duration-150"
                  >
                    {/* Location Type */}
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {contact.locationType || 'Taluk Office'}
                        </span>
                      </div>
                    </td>

                    {/* Designation / Resource Type */}
                    <td className="py-4 px-6 align-middle">
                      <div className="font-bold text-slate-900 text-base">
                        {contact.designation}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {contact.department}
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-4 px-6 align-middle">
                      {contact.mobileNo ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900 tracking-wide text-base">
                              {contact.mobileNo}
                            </span>
                            <button
                              onClick={() => handleCopy(contact.id, contact.mobileNo)}
                              title="Copy mobile number"
                              className="text-slate-400 hover:text-sky-600 p-1 rounded-md hover:bg-sky-50 transition-colors"
                            >
                              {copiedId === contact.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {contact.alternateNo && contact.alternateNo !== contact.mobileNo && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                              <span className="text-[10px] text-slate-400">Alt:</span>
                              <a
                                href={getCallLink(contact.alternateNo)}
                                className="hover:text-sky-700 underline underline-offset-2"
                              >
                                {contact.alternateNo}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Not available</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-6 align-middle">
                      {hasValidPhone ? (
                        <div className="flex items-center justify-center gap-2.5">
                          {/* CALL Button */}
                          <a
                            href={callHref}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-xs hover:shadow-md transition-all active:scale-95"
                          >
                            <Phone className="w-3.5 h-3.5 fill-current" />
                            <span>CALL</span>
                          </a>

                          {/* WhatsApp Button */}
                          {contact.isValidMobile ? (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs hover:shadow-md transition-all active:scale-95"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span
                              title="WhatsApp unavailable for this format"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 cursor-not-allowed"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400 font-medium">
                          No direct number
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View: Contact Cards */}
      <div className="md:hidden space-y-4">
        {contacts.map((contact) => {
          const callHref = getCallLink(contact.mobileNo);
          const waHref = getWhatsAppLink(contact.mobileNo);
          const hasValidPhone = contact.isValidMobile || (contact.cleanMobile && contact.cleanMobile.length >= 7);

          return (
            <div
              key={contact.id}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 p-5 shadow-md shadow-sky-900/5 space-y-4"
            >
              {/* Designation header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-lg leading-snug">
                    {contact.designation}
                  </h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    Official
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{contact.department}</span>
                </div>
              </div>

              {/* Location & Mobile info */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" /> Location:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {contact.locationType || 'Office'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Mobile:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-base">
                      {contact.mobileNo || '—'}
                    </span>
                    {contact.mobileNo && (
                      <button
                        onClick={() => handleCopy(contact.id, contact.mobileNo)}
                        className="text-slate-400 hover:text-sky-600 p-1"
                        title="Copy number"
                      >
                        {copiedId === contact.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {contact.alternateNo && contact.alternateNo !== contact.mobileNo && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">Alternate:</span>
                    <a
                      href={getCallLink(contact.alternateNo)}
                      className="font-mono text-slate-700 underline underline-offset-2"
                    >
                      {contact.alternateNo}
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons - Large and easy to tap */}
              {hasValidPhone ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* CALL Button */}
                  <a
                    href={callHref}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 active:scale-95 shadow-md shadow-blue-700/20 transition-all text-center"
                  >
                    <Phone className="w-4 h-4 fill-current shrink-0" />
                    <span>CALL</span>
                  </a>

                  {/* WhatsApp Button */}
                  {contact.isValidMobile ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 transition-all text-center"
                    >
                      <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 text-center">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>No WhatsApp</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2.5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl font-medium">
                  Direct phone dialer unavailable for this entry
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
