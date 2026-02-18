import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMeeting } from "../services/api";
import { useSnackbar } from "../contexts/SnackbarContext";

const ViewMeeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [meeting, setMeeting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewOptions] = useState({
    includeAttendance: true,
    includeHeader: true,
    fontSize: '11pt'
  });

  useEffect(() => {
    if (id) fetchMeeting(id);
  }, [id]);

  const fetchMeeting = async (mid: string) => {
    try {
      setLoading(true);
      const data = await getMeeting(mid);
      setMeeting(data);
    } catch (err: any) {
      showSnackbar(err.message || "Failed to load meeting", "error");
      // Don't auto-navigate - show error state instead
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    // Keep weekday + long month for header, but show dd/mm/yyyy for concise uses
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${dd}/${mm}/${yyyy}`;
  };

  const buildPrintHtml = (m: any, opts: any) => {
    const escape = (s: any) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Build meeting details table rows
    const tableRows = `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569; width: 33%;">Meeting Type:</td>
        <td style="padding: 4px 0; color: #0f172a;">${escape(m.meetingType)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569;">Person:</td>
        <td style="padding: 4px 0; color: #0f172a;">${escape(m.personName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569;">Date:</td>
        <td style="padding: 4px 0; color: #0f172a;">${new Date(m.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
      </tr>
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569;">Time:</td>
        <td style="padding: 4px 0; color: #0f172a;">${escape(m.startTime)} - ${escape(m.endTime)}</td>
      </tr>
      ${m.place ? `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569;">Place:</td>
        <td style="padding: 4px 0; color: #0f172a;">${escape(m.place)}</td>
      </tr>` : ''}
      ${m.presentSantName ? `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569;">Present Sant:</td>
        <td style="padding: 4px 0; color: #0f172a;">${escape(m.presentSantName)}</td>
      </tr>` : ''}
      ${opts.includeAttendance && m.attendance ? `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 4px 10px 4px 0; font-weight: bold; color: #475569; vertical-align: top;">Attendance:</td>
        <td style="padding: 4px 0; color: #0f172a;">${escape(m.attendance)}</td>
      </tr>` : ''}
    `;

    // Build agenda items
    const agendaHtml = (m.notes || []).map((note: any, idx: number) => {
      const title = m.notes.length === 1
        ? (note.title || 'Agenda Item')
        : `${idx + 1}. ${note.title || `Agenda Item ${idx + 1}`}`;

      const badges = `${note.important ? '<span style="font-size: 11px; font-weight: bold; color: #c2410c; border: 1px solid #c2410c; padding: 2px 6px; border-radius: 2px; margin-left: 8px;">IMPORTANT</span>' : ''}${note.followUp ? '<span style="font-size: 11px; font-weight: bold; color: #6b21a8; border: 1px solid #6b21a8; padding: 2px 6px; border-radius: 2px; margin-left: 6px;">FOLLOW-UP</span>' : ''}`;

      const points = note.points && note.points.length > 0
        ? note.points.map((p: any) => {
          const category = p.category ? ` <span style="font-size: 12px; font-style: italic; color: #475569;">[${escape(p.category)}]</span>` : '';
          return `<li style="margin-bottom: 4px; color: #0f172a; line-height: 1.4;"><span style="margin-right: 8px; font-weight: 600; color: #475569;">•</span>${escape(p.text)}${category}</li>`;
        }).join('')
        : '<div style="padding-left: 16px; font-size: 14px; color: #64748b; font-style: italic;">No discussion points recorded.</div>';

      return `
        <div style="margin-bottom: 10px;">
          <div style="margin-bottom: 5px;">
            <h3 style="display: inline; font-size: 14px; font-weight: bold; color: #0f172a; margin: 0;">${escape(title)}</h3>${badges}
          </div>
          ${note.points && note.points.length > 0 ? `
          <div style="padding-left: 16px;">
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
              ${points}
            </ul>
          </div>` : points}
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Meeting Minutes - ${escape(m.personName)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    @page {
      margin: 15mm 15mm 20mm 15mm;
      size: A4 portrait;
      
      @bottom-left {
        content: "Document Generated: " "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}";
        font-family: Georgia, "Times New Roman", serif;
        font-size: 11px;
        color: #475569;
      }
      
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 11px;
        color: #475569;
        font-weight: 600;
      }
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: white;
      line-height: 1.3;
    }
    
    .container {
      max-width: 100%;
    }
    
    .letterhead {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #0f172a;
    }
    
    .letterhead h1 {
      font-size: 22px;
      font-weight: bold;
      color: #0f172a;
      margin: 0 0 2px 0;
      letter-spacing: 2px;
    }
    
    .letterhead .center {
      font-size: 14px;
      color: #475569;
      font-weight: 600;
    }
    
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.2;
    }
    
    .section-header {
      font-size: 16px;
      font-weight: bold;
      color: #0f172a;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 4px;
      border-bottom: 2px solid #0f172a;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Letterhead Header -->
    <div class="letterhead">
      <h1>MEETING MINUTES</h1>
      <div class="center">${escape(m.center)} - ${escape(m.meetingType)}</div>
    </div>
    
    <!-- Meeting Details Table -->
    <table class="details-table">
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    
    <!-- Agenda Items -->
    <div>
      <h2 class="section-header">AGENDA & DISCUSSION</h2>
      ${agendaHtml}
    </div>
  </div>
</body>
</html>`;

    return html;
  };

  const handlePrint = (m: any, opts: any) => {
    try {
      const html = buildPrintHtml(m, opts);
      const w = window.open('', '_blank');
      if (!w) { alert('Unable to open print window (popup blocked).'); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 300);
    } catch (err) {
      console.error('Print failed', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center py-20 bg-transparent dark:bg-slate-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-slate-700 dark:border-t-slate-400"></div>
          <p className="mt-6 text-gray-600 dark:text-slate-400 font-medium">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex h-full flex-1 items-center justify-center py-20 bg-transparent dark:bg-slate-900 transition-colors">
        <div className="text-center">
          <div className="text-gray-600 dark:text-slate-400 text-lg mb-4">Meeting not found or failed to load</div>
          <button
            onClick={() => navigate("/add-meeting")}
            className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body { 
            background: white !important;
            color: #000 !important;
          }
          
          @page { 
            margin: 0.6in 0.5in;
            size: letter portrait;
          }
          
          /* Hide all navigation, headers, sidebars, hamburger menu, profile icons */
          aside, header, nav, button, .print\\:hidden { 
            display: none !important; 
          }
          
          /* Hide hamburger menu and app navigation */
          [role="navigation"], [data-sidebar], .sidebar, .navbar, .app-header {
            display: none !important;
          }
          
          /* Remove margins from main content container */
          .flex-1, main { 
            margin-left: 0 !important;
            margin-top: 0 !important;
            padding: 0 !important;
          }
          
          /* Ensure full width for print */
          .printable-meeting {
            max-width: 100% !important;
            padding: 0 !important;
          }

          /* Professional document header */
          .print-header {
            border-bottom: 3px solid #1e293b !important;
            padding-bottom: 16pt !important;
            margin-bottom: 20pt !important;
            background: linear-gradient(to right, #f8fafc, #f1f5f9) !important;
            padding: 16pt !important;
            border-radius: 4pt !important;
          }

          .print-header h1 {
            color: #1e293b !important;
            font-size: 20pt !important;
            font-weight: 700 !important;
            margin-bottom: 4pt !important;
            letter-spacing: -0.5pt !important;
          }

          .print-header-info {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8pt !important;
            margin-top: 12pt !important;
          }

          .print-info-item {
            font-size: 10pt !important;
            margin-bottom: 4pt !important;
          }

          .print-info-label {
            font-weight: 600 !important;
            color: #475569 !important;
            display: inline-block !important;
            width: 90pt !important;
          }

          .print-info-value {
            color: #1e293b !important;
          }

          /* Meeting info section */
          .meeting-info-print {
            background: #f8fafc !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 6pt !important;
            padding: 14pt !important;
            margin-bottom: 20pt !important;
          }

          /* Make category pills visible in print */
          .category-pill {
            display: inline-block !important;
            background: #e2e8f0 !important;
            border: 1.5px solid #64748b !important;
            color: #1e293b !important;
            box-shadow: none !important;
            padding: 3pt 8pt !important;
            font-size: 9pt !important;
            border-radius: 3pt !important;
            font-weight: 600 !important;
          }

          /* Note cards with professional styling */
          .note-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 2px solid #cbd5e1 !important;
            border-left: 5px solid #475569 !important;
            background: white !important;
            padding: 14pt !important;
            margin-bottom: 16pt !important;
            border-radius: 4pt !important;
          }

          .note-card h3 {
            font-size: 13pt !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            margin-bottom: 10pt !important;
            padding-bottom: 8pt !important;
            border-bottom: 2px solid #e2e8f0 !important;
          }

          /* Important and Follow-up badges */
          .note-badge {
            background: #fef3c7 !important;
            border: 1.5px solid #d97706 !important;
            color: #92400e !important;
            padding: 3pt 8pt !important;
            border-radius: 3pt !important;
            font-size: 9pt !important;
            font-weight: 600 !important;
            display: inline-block !important;
            margin-left: 8pt !important;
          }

          .note-badge.follow-up {
            background: #ddd6fe !important;
            border: 1.5px solid #7c3aed !important;
            color: #5b21b6 !important;
          }

          /* Points styling */
          .note-points {
            font-size: 11pt !important;
            line-height: 1.7 !important;
            color: #1e293b !important;
          }

          .note-points ol {
            margin-left: 16pt !important;
            padding-left: 8pt !important;
          }

          .note-points li {
            margin-bottom: 8pt !important;
            padding-left: 4pt !important;
          }

          /* Clean print styling - remove shadows */
          .printable-meeting * {
            box-shadow: none !important;
          }

          /* Typography optimization */
          .printable-meeting {
            font-size: 11pt !important;
            line-height: 1.6 !important;
            color: #1e293b !important;
          }

          /* Print footer */
          .print-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            text-align: center !important;
            font-size: 9pt !important;
            color: #64748b !important;
            border-top: 2px solid #e2e8f0 !important;
            padding-top: 8pt !important;
            margin-top: 20pt !important;
          }

          /* Page numbers */
          .page-number:after {
            counter-increment: page !important;
            content: "Page " counter(page) !important;
          }

          /* Section headings */
          .section-heading {
            font-size: 11pt !important;
            font-weight: 700 !important;
            color: #475569 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5pt !important;
            margin-bottom: 8pt !important;
            margin-top: 16pt !important;
          }
        }
      `}</style>

      <div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header Bar - Hidden in Print, Responsive */}
          <div className="print:hidden bg-slate-800 dark:bg-slate-900 shadow-md rounded-2xl mb-0 transition-colors border border-slate-700">
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {meeting.meetingType} - {meeting.center}
                  </h1>
                  <p className="text-sm text-slate-200 mt-1">Meeting Minutes</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => navigate(`/add-meeting/${meeting.id}/edit`)}
                    className="flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base border border-slate-200 dark:border-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-700 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base border border-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Print Preview Modal - Professional Meeting Minutes Design */}
          {showPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Print Preview</h2>
                      <p className="text-sm text-slate-300">Meeting Minutes Document</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Close
                    </button>
                    <button
                      onClick={() => handlePrint(meeting, previewOptions)}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2 shadow-lg shadow-slate-800/30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                  </div>
                </div>

                {/* Document Preview - Portrait A4 Style */}
                <div className="flex-1 overflow-auto bg-slate-100 p-8">
                  <div className="mx-auto bg-white shadow-xl" style={{
                    width: '210mm',
                    minHeight: '297mm',
                    maxWidth: '100%',
                    padding: '25mm 20mm',
                    fontFamily: 'Georgia, "Times New Roman", serif'
                  }}>
                    {/* Letterhead Header */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-slate-900">
                      <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ letterSpacing: '2px' }}>
                        MEETING MINUTES
                      </h1>
                      <div className="text-sm text-slate-600 font-semibold">
                        {meeting.center} - {meeting.meetingType}
                      </div>
                    </div>

                    {/* Meeting Details Table */}
                    <div className="mb-8">
                      <table className="w-full text-sm border-collapse">
                        <tbody>
                          <tr className="border-b border-slate-300">
                            <td className="py-2.5 pr-4 font-bold text-slate-700 w-1/3">Meeting Type:</td>
                            <td className="py-2.5 text-slate-900">{meeting.meetingType}</td>
                          </tr>
                          <tr className="border-b border-slate-300">
                            <td className="py-2.5 pr-4 font-bold text-slate-700">Person:</td>
                            <td className="py-2.5 text-slate-900">{meeting.personName}</td>
                          </tr>
                          <tr className="border-b border-slate-300">
                            <td className="py-2.5 pr-4 font-bold text-slate-700">Date:</td>
                            <td className="py-2.5 text-slate-900">
                              {new Date(meeting.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-300">
                            <td className="py-2.5 pr-4 font-bold text-slate-700">Time:</td>
                            <td className="py-2.5 text-slate-900">{meeting.startTime} - {meeting.endTime}</td>
                          </tr>
                          {meeting.place && (
                            <tr className="border-b border-slate-300">
                              <td className="py-2.5 pr-4 font-bold text-slate-700">Place:</td>
                              <td className="py-2.5 text-slate-900">{meeting.place}</td>
                            </tr>
                          )}
                          {meeting.presentSantName && (
                            <tr className="border-b border-slate-300">
                              <td className="py-2.5 pr-4 font-bold text-slate-700">Present Sant:</td>
                              <td className="py-2.5 text-slate-900">{meeting.presentSantName}</td>
                            </tr>
                          )}
                          {previewOptions.includeAttendance && meeting.attendance && (
                            <tr className="border-b border-slate-300">
                              <td className="py-2.5 pr-4 font-bold text-slate-700 align-top">Attendance:</td>
                              <td className="py-2.5 text-slate-900">{meeting.attendance}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Agenda Items */}
                    <div className="mb-8">
                      <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-900">
                        AGENDA & DISCUSSION
                      </h2>

                      <div className="space-y-6">
                        {meeting.notes.map((note: any, idx: number) => (
                          <div key={note.id} className="mb-6">
                            {/* Agenda Title */}
                            <div className="mb-3">
                              <h3 className="text-base font-bold text-slate-900 inline">
                                {meeting.notes.length === 1
                                  ? (note.title || 'Agenda Item')
                                  : `${idx + 1}. ${note.title || `Agenda Item ${idx + 1}`}`}
                              </h3>
                              {(note.important || note.followUp) && (
                                <span className="ml-3">
                                  {note.important && (
                                    <span className="text-xs font-bold text-orange-700 border border-orange-700 px-2 py-0.5 rounded">
                                      IMPORTANT
                                    </span>
                                  )}
                                  {note.followUp && (
                                    <span className="text-xs font-bold text-purple-700 border border-purple-700 px-2 py-0.5 rounded ml-2">
                                      FOLLOW-UP
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Discussion Points */}
                            {note.points && note.points.length > 0 ? (
                              <div className="pl-6">
                                <ul className="space-y-2 list-none">
                                  {note.points.map((p: any, i: number) => (
                                    <li key={p.id || i} className="text-sm text-slate-800 leading-relaxed flex">
                                      <span className="mr-3 font-semibold text-slate-600">•</span>
                                      <span className="flex-1">
                                        {p.text}
                                        {p.category && (
                                          <span className="ml-2 text-xs italic text-slate-600">
                                            [{p.category}]
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="pl-6 text-sm text-slate-500 italic">
                                No discussion points recorded.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Footer */}
                    <div className="mt-16 pt-4 border-t border-slate-400">
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <div>
                          <div className="font-semibold">Document Generated:</div>
                          <div>{new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">Page 1 of 1</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content - printable wrapper */}
          <div className="py-6 sm:py-8 print:p-0 print:max-w-full printable-meeting">
            {/* Print Header */}
            <div className="hidden print:block print-header">
              <h1>MEETING MINUTES</h1>
              <div className="print-header-info">
                <div>
                  <div className="print-info-item">
                    <span className="print-info-label">Meeting Type:</span>
                    <span className="print-info-value">{meeting.meetingType}</span>
                  </div>
                  <div className="print-info-item">
                    <span className="print-info-label">Person:</span>
                    <span className="print-info-value">{meeting.personName}</span>
                  </div>
                  <div className="print-info-item">
                    <span className="print-info-label">Center:</span>
                    <span className="print-info-value">{meeting.center}</span>
                  </div>
                  {meeting.presentSantName && (
                    <div className="print-info-item">
                      <span className="print-info-label">Present Sant:</span>
                      <span className="print-info-value">{meeting.presentSantName}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="print-info-item">
                    <span className="print-info-label">Date:</span>
                    <span className="print-info-value">{(() => {
                      const d = new Date(meeting.date);
                      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    })()}</span>
                  </div>
                  <div className="print-info-item">
                    <span className="print-info-label">Time:</span>
                    <span className="print-info-value">{meeting.startTime} - {meeting.endTime}</span>
                  </div>
                  {meeting.place && (
                    <div className="print-info-item">
                      <span className="print-info-label">Place:</span>
                      <span className="print-info-value">{meeting.place}</span>
                    </div>
                  )}
                  <div className="print-info-item">
                    <span className="print-info-label">Generated:</span>
                    <span className="print-info-value">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
              {meeting.attendance && (
                <div className="print-info-item" style={{ marginTop: '12pt' }}>
                  <span className="print-info-label">Attendance:</span>
                  <span className="print-info-value">{meeting.attendance}</span>
                </div>
              )}
            </div>

            {/* Meeting Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-4 sm:mb-6 meeting-info-print print:shadow-none print:rounded-none transition-colors">
              <div className="p-4 sm:p-6 lg:p-8 print:p-0 print:hidden">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 print:mb-4 gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1 print:text-xl">{meeting.personName}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 print:text-sm">{meeting.center}</p>
                    {meeting.presentSantName && (
                      <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mt-1 print:text-sm">Present Sant: {meeting.presentSantName}</p>
                    )}
                  </div>
                  <div className="print:hidden flex items-center gap-2">
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-xs sm:text-sm transition-colors">
                      {meeting.meetingType}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-gray-200 print:grid-cols-3 print:gap-8 print:pt-4 print:border-t-0">
                  <div className="flex items-center gap-3 print:block transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 print:hidden transition-colors border border-transparent dark:border-slate-600">
                      <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-500 font-semibold uppercase tracking-wide print:text-[10px] print:mb-0.5">Center</p>
                      <p className="text-sm text-gray-900 dark:text-slate-100 font-medium mt-0.5 print:text-xs print:mt-0">{meeting.center}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 print:block transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 print:hidden transition-colors border border-transparent dark:border-slate-600">
                      <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-500 font-semibold uppercase tracking-wide print:text-[10px] print:mb-0.5">Date</p>
                      <p className="text-sm text-gray-900 dark:text-slate-100 font-medium mt-0.5 print:text-xs print:mt-0">{formatDate(meeting.date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 print:block transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 print:hidden">
                      <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-500 font-semibold uppercase tracking-wide print:text-[10px] print:mb-0.5">Time</p>
                      <p className="text-sm text-gray-900 dark:text-slate-100 font-medium mt-0.5 print:text-xs print:mt-0">{meeting.startTime} - {meeting.endTime}</p>
                    </div>
                  </div>
                </div>

                {/* Additional fields for structured meetings */}
                {meeting.meetingType !== "One o one" && (meeting.day || meeting.place || meeting.attendance) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-6 border-t border-gray-200 dark:border-slate-700 print:grid-cols-2 print:gap-8 print:pt-4">
                    {meeting.day && (
                      <div className="flex items-center gap-3 print:block">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 print:hidden transition-colors">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-500 font-semibold uppercase tracking-wide print:text-[10px] print:mb-0.5">Day</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 font-medium mt-0.5 print:text-xs print:mt-0">{meeting.day}</p>
                        </div>
                      </div>
                    )}

                    {meeting.place && (
                      <div className="flex items-center gap-3 print:block">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 print:hidden transition-colors">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-500 font-semibold uppercase tracking-wide print:text-[10px] print:mb-0.5">Place</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 font-medium mt-0.5 print:text-xs print:mt-0">{meeting.place}</p>
                        </div>
                      </div>
                    )}

                    {meeting.attendance && (
                      <div className="md:col-span-2 flex items-start gap-3 print:col-span-2 print:block transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 print:hidden">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-slate-500 font-semibold uppercase tracking-wide print:text-[10px] print:mb-0.5">Attendance</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 font-medium mt-0.5 print:text-xs print:mt-0">{meeting.attendance}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meeting Type for Print */}
                <div className="hidden print:block mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Meeting Type</p>
                  <p className="text-xs text-gray-900 font-medium">{meeting.meetingType}</p>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-5 print:space-y-4">
              <h2 className="hidden print:block section-heading">Meeting Agenda & Minutes</h2>
              {meeting.notes.map((note: any, idx: number) => (
                <div key={note.id} className="note-card bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                  <div className="flex items-start justify-between mb-4 print:mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                        {meeting.notes.length === 1 ? (note.title || 'Agenda') : (`Agenda ${idx + 1}${note.title ? ': ' + note.title : ''}`)}
                      </h3>
                      {note.important && (
                        <span className="note-badge inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-lg text-xs font-semibold transition-colors">
                          <svg className="w-3.5 h-3.5 print:hidden" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                          </svg>
                          Important
                        </span>
                      )}
                      {note.followUp && (
                        <span className="note-badge follow-up inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold transition-colors">
                          <svg className="w-3.5 h-3.5 print:hidden" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          Follow-up
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="note-points space-y-3 print:space-y-2">
                    <div className="text-sm text-gray-500 dark:text-slate-500 font-medium mb-2">Minutes:</div>

                    {/* Show first point inline, remaining points start numbering at 2 */}
                    {note.points && note.points.length > 0 && (
                      <div className="text-gray-800 dark:text-slate-200">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="font-medium">1.&nbsp;{note.points[0].text}</span>
                          {note.points[0].category && (
                            <div className="category-pill ml-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-600">
                              {note.points[0].category}
                            </div>
                          )}
                        </div>

                        {note.points.length > 1 && (
                          <ol className="list-decimal ml-6 space-y-2" start={2}>
                            {note.points.slice(1).map((p: any) => (
                              <li key={p.id} className="text-gray-700 dark:text-slate-300 leading-relaxed text-base print:text-xs print:leading-normal">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">{p.text}</div>
                                  {p.category && (
                                    <div className="ml-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 print:hidden border border-slate-200 dark:border-slate-600">
                                      {p.category}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Print Footer */}
            <div className="hidden print:block print-footer">
              <p>
                <strong>Meeting Minutes</strong> - {meeting.personName} | {meeting.center} | {(() => {
                  const d = new Date(meeting.date);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewMeeting;
