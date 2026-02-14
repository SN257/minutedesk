import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMeeting } from "../services/api";
import { useConfirm } from "../components/ConfirmProvider";
import { useSnackbar } from "../contexts/SnackbarContext";
import { useMeetings } from "../contexts/MeetingsContext";
import AttendanceTooltip from "../components/AttendanceTooltip";

type Note = {
  id: string;
  points: Array<{ id: string; text: string }>;
  important: boolean;
  followUp: boolean;
};

type Meeting = {
  id: string;
  center: string;
  personName?: string;
  date: string;
  day?: string;
  startTime: string;
  endTime: string;
  place?: string;
  attendance?: string;
  meetingType: string;
  notes: Note[];
  createdAt: string;
};

const AddMeeting = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { meetings, loading, fetchMeetings, invalidateCache } = useMeetings();
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMeetings();
  }, []);

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete meeting', message: 'Are you sure you want to delete this meeting?' });
    if (!ok) return;
    try {
      await deleteMeeting(id);
      showSnackbar('Meeting deleted', 'success');
      invalidateCache();
      await fetchMeetings(true); // Force refetch after delete
    } catch (err: any) {
      if (err?.message === 'NotFound') {
        showSnackbar('Meeting already deleted (not found on server)', 'info');
        invalidateCache();
        await fetchMeetings(true); // Refetch to sync state
        return;
      }
      showSnackbar(err.message || 'Failed to delete meeting', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const ITEMS_PER_PAGE = 5;

  const formatCenterName = (s: string) => {
    return s
      .split(' ')
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ');
  };

  const getPageData = (items: Meeting[], type: string) => {
    const page = currentPages[type] || 1;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / ITEMS_PER_PAGE),
      currentPage: page
    };
  };

  const handlePageChange = (type: string, page: number) => {
    setCurrentPages(prev => ({ ...prev, [type]: page }));
  };

  // Group meetings by meetingType
  // Sort meetings by date (newest first) and then group by meetingType
  const sorted = [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const grouped = sorted.reduce((acc: Record<string, Meeting[]>, m) => {
    const key = m.meetingType || "Others";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, Meeting[]>);

  // Render table headers based on meeting type
  const renderTableHeaders = (type: string) => {
    const isOneOnOne = type === "One o one";
    
    return (
      <thead className="bg-gray-50">
        <tr>
          {isOneOnOne && (
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Person Name</th>
          )}
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Center</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
          {!isOneOnOne && (
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Day</th>
          )}
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Time</th>
          {!isOneOnOne && (
            <>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Place</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Attendance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Present Sant</th>
            </>
          )}
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Agendas</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
    );
  };

  // Render table row based on meeting type
  const renderTableRow = (meeting: Meeting, type: string) => {
    const isOneOnOne = type === "One o one";
    // Count total points across all notes (each note has a points[])
    const totalPoints = meeting.notes.reduce((acc, n) => acc + (n.points ? n.points.length : 0), 0);
    
    return (
      <tr key={meeting.id} className="group hover:bg-gray-50 transition-colors">
        {isOneOnOne && (
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="text-sm font-medium text-slate-900">{meeting.personName || '-'}</div>
          </td>
        )}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm font-medium text-slate-900">{formatCenterName(meeting.center)}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-slate-700">{formatDate(meeting.date)}</div>
        </td>
        {!isOneOnOne && (
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="text-sm text-slate-700">{meeting.day || '-'}</div>
          </td>
        )}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-slate-700">{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</div>
        </td>
        {!isOneOnOne && (
          <>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="text-sm text-slate-700">{meeting.place || '-'}</div>
            </td>
            <td className="px-4 py-3">
              <AttendanceTooltip attendance={meeting.attendance} />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="text-sm text-slate-700">{(meeting as any).presentSantName || '-'}</div>
            </td>
          </>
        )}
        <td className="px-4 py-3">
          <div className="text-sm text-slate-700">
            <span className="font-medium mr-2">{totalPoints}</span>
            <span className="text-slate-600">point{totalPoints !== 1 ? "s" : ""}</span>
            {meeting.notes.some((n) => n.important) && (
              <span className="ml-2 text-red-500" title="Has important notes">⚠️</span>
            )}
            {meeting.notes.some((n) => n.followUp) && (
              <span className="ml-1 text-slate-500" title="Requires follow-up">🔔</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end gap-0">
            <button
              onClick={() => navigate(`/add-meeting/${meeting.id}`)}
              title="View"
              className="p-0.5 rounded-md hover:bg-gray-100"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            <button
              onClick={() => navigate(`/add-meeting/${meeting.id}/edit`)}
              title="Edit"
              aria-label={`Edit meeting ${meeting.id}`}
              className="p-0.5 rounded-md hover:bg-gray-100"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.914-9.914a1 1 0 000-1.414l-3.586-3.586a1 1 0 00-1.414 0L4.293 14.293A1 1 0 004 15v4z" />
              </svg>
            </button>

            <button
              onClick={() => handleDelete(meeting.id)}
              title="Delete"
              className="p-0.5 rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4l1 4H9l1-4z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <style>
        {`
          @media print {
            body {
              background: #e5e5e5 !important;
            }

            nav,
            header,
            footer,
            .no-print {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 0;
            }

            .print-container {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
            }

            .print-sheet {
              width: 100%;
              min-height: 297mm;
              padding: 20mm;
              box-sizing: border-box;
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
            }

            .print-header {
              background: #4b4b4b;
              color: #ffffff;
              padding: 18px 20px;
              font-size: 26px;
              font-weight: 700;
              letter-spacing: 2px;
              text-transform: uppercase;
            }

            .print-section {
              margin-top: 20px;
              border: 1px solid #d1d5db;
            }

            .print-section-title {
              background: #6b7280;
              color: #ffffff;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 1px;
              padding: 6px 10px;
              text-transform: uppercase;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            .print-table th,
            .print-table td {
              border: 1px solid #e5e7eb;
              padding: 6px 8px;
              text-align: left;
            }

            .print-table th {
              background: #f3f4f6;
              font-weight: 600;
            }

            h1, h2, h3 {
              page-break-after: avoid;
            }

            .page-break {
              page-break-before: always;
            }
          }
        `}
      </style>
      <div className="max-w-7xl mx-auto print-container">
        <div className="print-sheet">
      {/* Header Section - Responsive */}
      <div className="bg-white border-b-4 border-slate-600 rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Meeting Minutes</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all recorded meeting minutes</p>
        </div>
        <button
          onClick={() => navigate("/add-meeting/new")}
          className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 transition-colors shadow-sm flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Minutes
        </button>
      </div>

      {/* Meetings List (grouped by type) */}
      <div className="">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
            <p className="mt-4 text-gray-500">Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">No meeting minutes yet</h3>
            <p className="mt-2 text-sm sm:text-base text-gray-500">Get started by adding your first meeting minutes.</p>
            <button
              onClick={() => navigate("/add-meeting/new")}
              className="mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
            >
              Add First Minutes
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, items]) => {
              const pageData = getPageData(items, type);
              
              return (
                <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="bg-slate-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">{type}</h3>
                      <span className="px-2 sm:px-3 py-1 bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-full">
                        {items.length} {items.length === 1 ? 'meeting' : 'meetings'}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      {renderTableHeaders(type)}
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pageData.items.map((meeting) => renderTableRow(meeting, type))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pageData.totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(pageData.currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(pageData.currentPage * ITEMS_PER_PAGE, items.length)}
                          </span>{' '}
                          of <span className="font-medium">{items.length}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePageChange(type, pageData.currentPage - 1)}
                            disabled={pageData.currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          
                          {Array.from({ length: pageData.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(type, page)}
                              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                page === pageData.currentPage
                                  ? 'bg-slate-800 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={() => handlePageChange(type, pageData.currentPage + 1)}
                            disabled={pageData.currentPage === pageData.totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      </div>
    </>
  );
};

export default AddMeeting;
