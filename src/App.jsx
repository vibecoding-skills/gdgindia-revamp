import React, { useState, useEffect, useMemo } from 'react';
import './index.css';
import chaptersData from './data/chapters.json';
import photosData from './data/photos.json';
import GoogleIndiaMap from './components/GoogleIndiaMap';
import { withUpcomingEvents, pickRandom, isDevFest, hasPlaceholderDate, eventSortDate } from './lib/events';

// Each tab has its own URL so pages like /devfest can be linked directly.
// nginx.conf serves index.html for unknown paths, so deep links work in production.
const TAB_PATHS = {
  hub: '/',
  chapters: '/chapters',
  events: '/events',
  devfests: '/devfest',
  gallery: '/gallery',
};

const tabFromPath = (pathname) => {
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (path === '/devfests') return 'devfests';
  return Object.keys(TAB_PATHS).find(tab => TAB_PATHS[tab] === path) || 'hub';
};

function App() {
  const [activeTab, setActiveTab] = useState(() => tabFromPath(window.location.pathname));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showOnlyWithEvents, setShowOnlyWithEvents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visiblePhotosCount, setVisiblePhotosCount] = useState(12);
  const [previewImages] = useState(() => pickRandom(photosData, 2));

  // Events are filtered once per page load so finished events never show as upcoming.
  const chapters = useMemo(() => withUpcomingEvents(chaptersData), []);
  const totalUpcomingEvents = chapters.reduce((acc, chapter) => acc + chapter.events.length, 0);

  // Any change to a tab, search or filter starts again from page 1.
  const selectTab = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (window.location.pathname !== TAB_PATHS[tab]) {
      window.history.pushState({}, '', TAB_PATHS[tab]);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(tabFromPath(window.location.pathname));
      setCurrentPage(1);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const changeSearchTerm = (value) => { setSearchTerm(value); setCurrentPage(1); };
  const changeFilterType = (value) => { setFilterType(value); setCurrentPage(1); };
  const changeShowOnlyWithEvents = (value) => { setShowOnlyWithEvents(value); setCurrentPage(1); };
  const changeEventSearchTerm = (value) => { setEventSearchTerm(value); setCurrentPage(1); };

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
      if (e.key === 'ArrowRight') setSelectedPhotoIndex(prev => (prev + 1) % photosData.length);
      if (e.key === 'ArrowLeft') setSelectedPhotoIndex(prev => (prev - 1 + photosData.length) % photosData.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex]);

  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = chapter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chapter.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || chapter.type === filterType;
    const matchesEvents = !showOnlyWithEvents || chapter.events.length > 0;
    return matchesSearch && matchesFilter && matchesEvents;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const ITEMS_PER_PAGE = 24;
  const totalPages = Math.ceil(filteredChapters.length / ITEMS_PER_PAGE);
  const displayedChapters = filteredChapters.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderChapters = () => (
    <div className="flex-1 w-full bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-8 border border-white/40 shadow-sm flex flex-col mt-4">
      <div className="flex flex-col items-center justify-center pt-8 pb-10">
        <h2 className="google-sans text-4xl md:text-5xl font-bold text-slate-900 mb-8 tracking-tight text-center">Find your community</h2>

        <div className="relative w-full max-w-2xl mb-8">
          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[var(--color-google-blue)] text-2xl font-bold">search</span>
          <input
            type="text"
            placeholder="Search by city or chapter name..."
            value={searchTerm}
            onChange={(e) => changeSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 rounded-full bg-white border-2 border-slate-100 text-lg focus:outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 shadow-lg shadow-slate-200/50 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3 px-2">
          <button
            onClick={() => changeFilterType('All')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${filterType === 'All' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            All Chapters
          </button>
          <button
            onClick={() => changeFilterType('GDG')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'GDG' ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 shadow-sm' : 'bg-white text-slate-500 border-2 border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span> GDG
          </button>
          <button
            onClick={() => changeFilterType('GDG Cloud')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'GDG Cloud' ? 'bg-cyan-50 text-cyan-700 border-2 border-cyan-200 shadow-sm' : 'bg-white text-slate-500 border-2 border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[18px]">cloud</span> GDG Cloud
          </button>
          <div className="w-[1px] h-6 bg-slate-200 mx-2"></div>
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all text-slate-600 shadow-sm">
            <input
              type="checkbox"
              checked={showOnlyWithEvents}
              onChange={(e) => changeShowOnlyWithEvents(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[var(--color-google-blue)] focus:ring-[var(--color-google-blue)]"
            />
            Has Upcoming Events
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100/50 p-4 md:p-6">
        <div className="flex justify-between items-center mb-6 px-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {searchTerm || filterType !== 'All' || showOnlyWithEvents ? `Found ${filteredChapters.length} results` : `Showing all ${chapters.length} chapters`}
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-2 pb-4 hide-scrollbar">
          {displayedChapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {displayedChapters.map((chapter) => (
                <a
                  key={chapter.url}
                  href={chapter.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${chapter.type === 'GDG Cloud' ? 'bg-cyan-50 text-cyan-700' : 'bg-blue-50 text-blue-700'}`}>
                        {chapter.type}
                      </div>
                      <div className="flex items-center gap-2">
                        {chapter.events.length > 0 && (
                          <div className="bg-red-50 text-[var(--color-google-red)] border border-red-100 text-[9px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 animate-pulse" title={`${chapter.events.length} upcoming event(s)`}>
                            <span className="material-symbols-outlined text-[10px]">calendar_month</span>
                            {chapter.events.length} UPCOMING EVENT{chapter.events.length > 1 ? 'S' : ''}
                          </div>
                        )}
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-[var(--color-google-blue)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all text-lg">arrow_outward</span>
                      </div>
                    </div>
                    <h3 className="google-sans text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-[var(--color-google-blue)] transition-colors">{chapter.name}</h3>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mt-auto tracking-widest relative z-10">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {chapter.city}
                  </p>
                  <div className="absolute -bottom-6 -right-6 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <span className="material-symbols-outlined text-[100px]">{chapter.type === 'GDG Cloud' ? 'cloud' : 'group'}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">search_off</span>
              <p className="text-lg font-medium text-slate-500">No chapters found matching your criteria</p>
              <button
                onClick={() => { changeSearchTerm(''); changeFilterType('All'); }}
                className="mt-4 text-sm font-bold text-[var(--color-google-blue)] hover:underline"
              >
                Clear Filters
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-8 border-t border-slate-100 pb-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const allUpcomingEvents = chapters.flatMap(chapter =>
    chapter.events.map(event => ({ ...event, chapter }))
  );
  const devFestEvents = allUpcomingEvents.filter(isDevFest);

  // Shared list used by the Events and DevFests tabs.
  const renderEventList = ({ heading, subheading, events, noun, emptyIcon, emptyText, accent }) => {
    const searchLower = eventSearchTerm.toLowerCase();
    const matchingEvents = events
      .filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.chapter.name.toLowerCase().includes(searchLower) ||
        event.chapter.city.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => eventSortDate(a) - eventSortDate(b));

    const EVENTS_PER_PAGE = 12;
    const totalEventPages = Math.ceil(matchingEvents.length / EVENTS_PER_PAGE);
    const displayedEvents = matchingEvents.slice((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE);

    return (
      <div className="flex-1 w-full bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-8 border border-white/40 shadow-sm flex flex-col mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 px-2 gap-4">
          <div className="flex flex-col">
            <h2 className="google-sans text-3xl font-bold text-slate-900 tracking-tight">{heading}</h2>
            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">{subheading}</p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64 lg:w-80">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">search</span>
              <input
                type="text"
                placeholder={`Search ${noun.toLowerCase()}, cities...`}
                value={eventSearchTerm}
                onChange={(e) => changeEventSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:border-blue-200 focus:ring-2 focus:ring-blue-500/10 shadow-sm transition-all text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>

            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-2.5 rounded-full whitespace-nowrap">
              {eventSearchTerm ? `Found ${matchingEvents.length}` : `Showing ${matchingEvents.length}`} {noun}
            </p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-2 pb-4 hide-scrollbar">
          {displayedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedEvents.map((event) => {
                const dateTBA = hasPlaceholderDate(event);
                const eventDate = new Date(event.start_date);
                const day = dateTBA ? 'TBA' : eventDate.getDate();
                const month = dateTBA ? 'Date' : eventDate.toLocaleString('default', { month: 'short' });
                const time = dateTBA
                  ? `Date to be announced, listed until ${new Date(event.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                  : eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <a
                    key={`${event.chapter.url}-${event.url}-${event.start_date}`}
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`flex flex-col items-center justify-center rounded-xl w-14 h-14 border shadow-sm transition-transform group-hover:scale-105 ${accent}`}>
                        <span className="text-xs font-bold uppercase">{month}</span>
                        <span className={dateTBA ? 'text-sm font-black' : 'text-xl font-black'}>{day}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isDevFest(event) && (
                          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider bg-red-50 text-[var(--color-google-red)] border border-red-100">
                            DevFest
                          </span>
                        )}
                        {event.type && (
                          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-100">
                            {event.type}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto">
                      <h3 className="google-sans text-lg font-bold text-slate-800 mb-4 leading-tight group-hover:text-[var(--color-google-blue)] transition-colors line-clamp-2">{event.title}</h3>

                      <div className="flex flex-col gap-2 pt-4 border-t border-slate-100/60">
                        <p className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 tracking-wider">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {time}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 tracking-wider">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {event.chapter.city}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 tracking-wider">
                          <span className="material-symbols-outlined text-[14px]">group</span>
                          Hosted by {event.chapter.name}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">{emptyIcon}</span>
              <p className="text-lg font-medium text-slate-500">{emptyText}</p>
            </div>
          )}

          {totalEventPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-8 border-t border-slate-100 pb-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalEventPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalEventPages))}
                disabled={currentPage === totalEventPages}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEvents = () => renderEventList({
    heading: 'Upcoming Events',
    subheading: 'Updated daily',
    events: allUpcomingEvents,
    noun: 'Events',
    emptyIcon: 'event_busy',
    emptyText: 'No upcoming events found',
    accent: 'bg-blue-50 text-blue-700 border-blue-100',
  });

  const renderDevFests = () => renderEventList({
    heading: 'DevFests',
    subheading: 'Flagship conferences, roadshows and pre-DevFest sessions across India. Updated daily',
    events: devFestEvents,
    noun: 'DevFests',
    emptyIcon: 'celebration',
    emptyText: 'No upcoming DevFests announced yet',
    accent: 'bg-red-50 text-[var(--color-google-red)] border-red-100',
  });

  const renderGallery = () => (
    <div className="flex-1 w-full bg-white/80 backdrop-blur-md rounded-3xl p-4 md:p-8 border border-white/40 shadow-sm flex flex-col mt-4">
      <div className="flex flex-col items-center justify-center pt-8 pb-10">
        <h2 className="google-sans text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight text-center">Event Gallery</h2>
        <p className="text-slate-500 font-medium max-w-lg text-center">Relive the best moments across chapters in India.</p>

        <div className="w-full mt-12 columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
          {photosData.slice(0, visiblePhotosCount).map((photo, index) => (
            <div
              key={photo}
              className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 bg-slate-100 cursor-pointer"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              <img
                src={photo}
                alt={`GDG India Event Moment ${index + 1}`}
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <div className="p-5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-white text-[18px]">photo_camera</span>
                    <span className="text-white text-xs font-bold uppercase tracking-widest truncate">{photo.split('/').pop().replace('.jpg', '').replace('.jpeg', '').replace('.png', '').replace('.JPG', '')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {visiblePhotosCount < photosData.length && (
          <div className="mt-12 flex justify-center w-full">
            <button
              onClick={() => setVisiblePhotosCount(prev => Math.min(prev + 12, photosData.length))}
              className="px-8 py-3 bg-white text-[var(--color-google-blue)] border-2 border-[var(--color-google-blue)]/20 hover:border-[var(--color-google-blue)] hover:bg-blue-50 font-bold rounded-full transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">expand_more</span>
              Load More Photos
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {selectedPhotoIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center" onClick={() => setSelectedPhotoIndex(null)}>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
            className="absolute top-6 right-6 md:top-8 md:right-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all z-20"
          >
            <span className="material-symbols-outlined text-2xl md:text-3xl">close</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(prev => (prev - 1 + photosData.length) % photosData.length); }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 md:p-4 rounded-full transition-all z-20"
          >
            <span className="material-symbols-outlined text-3xl md:text-4xl">chevron_left</span>
          </button>

          <div className="relative max-w-7xl max-h-[90vh] w-full mx-4 md:mx-16 flex flex-col items-center justify-center pointer-events-none px-12 md:px-0">
            <img
              src={photosData[selectedPhotoIndex]}
              alt="GDG India Gallery Fullscreen"
              className="max-h-[75vh] md:max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 md:mt-6 flex flex-col items-center pointer-events-auto">
              <span className="text-white/90 text-xs md:text-sm font-medium tracking-wide bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 text-center max-w-full truncate">
                {photosData[selectedPhotoIndex].split('/').pop().replace('.jpg', '').replace('.jpeg', '').replace('.png', '').replace('.JPG', '')}
              </span>
              <span className="text-white/50 text-[10px] md:text-xs mt-2 font-bold tracking-widest">{selectedPhotoIndex + 1} OF {photosData.length}</span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(prev => (prev + 1) % photosData.length); }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 md:p-4 rounded-full transition-all z-20"
          >
            <span className="material-symbols-outlined text-3xl md:text-4xl">chevron_right</span>
          </button>
        </div>
      )}

      <nav className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-50 w-[95vw] sm:w-max max-w-full">
        <div className="pill-nav rounded-full px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 overflow-x-auto hide-scrollbar w-full sm:w-auto mx-auto shadow-lg border border-slate-200/50">
          <button onClick={() => selectTab('hub')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'hub' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>Hub</button>
          <button onClick={() => selectTab('chapters')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'chapters' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>Chapters</button>
          <button onClick={() => selectTab('events')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'events' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>Events</button>
          <button onClick={() => selectTab('devfests')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'devfests' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>DevFests</button>
          <a className="px-4 md:px-6 py-2 md:py-2.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 transition-colors text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0" href="#" onClick={(e) => { e.preventDefault(); selectTab('gallery'); }}>Gallery</a>
          <a className="px-4 md:px-6 py-2 md:py-2.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 transition-colors text-xs md:text-sm font-medium flex items-center gap-1 md:gap-1.5 whitespace-nowrap flex-shrink-0" href="https://github.com/GDG-India/awesome-gdg-gde" target="_blank" rel="noopener noreferrer">
            Resources <span className="material-symbols-outlined text-[14px] md:text-[16px] -mt-0.5">open_in_new</span>
          </a>
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto h-full flex flex-col pb-24">
        <header className="flex justify-between items-center mb-6 px-2">
          <button onClick={() => selectTab('hub')} className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none text-left">
            <img src="/gdg-logo.png" alt="GDG India Logo" className="h-8" />
            <span className="google-sans text-xl font-medium tracking-tight mt-1 text-slate-900 border-none outline-none">GDG <span className="text-slate-400">India</span></span>
          </button>
        </header>

        {activeTab === 'hub' ? (
          <div className="grid-layout">
            <section className="col-span-12 lg:col-span-7 row-span-6 bento-card p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="google-sans text-6xl xl:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6">
                  India's <br />Developer <br />
                  <span className="text-[var(--color-google-blue)] drop-shadow-sm">Revolution</span>
                </h1>

                <div className="max-w-xl mb-4 relative z-20">
                  <p className="text-slate-600 font-medium mb-4 text-sm md:text-base leading-relaxed">
                    Google Developer Groups (GDGs) are local communities full of passionate developers, students, and professionals interested in Google's developer technology.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-yellow-50 text-[var(--color-google-yellow)] text-xs font-bold rounded-full border border-yellow-100 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-google-yellow)]"></span>Artificial Intelligence</span>
                    <span className="px-3 py-1 bg-green-50 text-[var(--color-google-green)] text-xs font-bold rounded-full border border-green-100 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-google-green)]"></span>Android</span>
                    <span className="px-3 py-1 bg-red-50 text-[var(--color-google-red)] text-xs font-bold rounded-full border border-red-100 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-google-red)]"></span>Web</span>
                    <span className="px-3 py-1 bg-blue-50 text-[var(--color-google-blue)] text-xs font-bold rounded-full border border-blue-100 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-google-blue)]"></span>Cloud</span>
                    <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-full border border-slate-200">Flutter</span>
                    <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-full border border-slate-200">Firebase</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 bg-slate-100/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200 text-slate-500">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Independent Community web page, Website is not officially managed by Google</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8">
                <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Professional Chapters</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{chapters.length}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Cities Across India</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[var(--color-google-blue)] tracking-tighter drop-shadow-sm">{new Set(chapters.map(c => c.city)).size}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Upcoming Events</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[var(--color-google-green)] tracking-tighter drop-shadow-sm">
                        {totalUpcomingEvents}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">DevFests</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[var(--color-google-red)] tracking-tighter drop-shadow-sm">
                        {devFestEvents.length}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-3 uppercase tracking-widest">Updated daily</p>
              </div>

              <div className="absolute -bottom-20 -right-20 opacity-[0.03] pointer-events-none">
                <span className="material-symbols-outlined text-[400px]">language</span>
              </div>
            </section>
            <aside className="col-span-12 lg:col-span-5 row-span-6 bento-card p-6 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="google-sans text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-google-blue)]">public</span>
                  GDG Chapters Across India
                </h3>
              </div>
              <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50 relative min-h-[400px]">
                <GoogleIndiaMap chapters={chapters} />
              </div>
            </aside>
            <section className="col-span-12 row-span-4 bento-card p-6 md:p-12 bg-white border-2 border-slate-100 group cursor-pointer overflow-hidden relative" onClick={() => selectTab('gallery')}>
              <div className="flex flex-col md:flex-row gap-8 md:gap-12 h-full items-center">
                <div className="flex-1 flex flex-col justify-center h-full z-20">
                  <div>
                    <div className="w-16 h-16 rounded-3xl bg-[var(--color-google-yellow)]/10 flex items-center justify-center mb-6 md:mb-8">
                      <span className="material-symbols-outlined text-[32px] text-[var(--color-google-yellow)]">photo_library</span>
                    </div>
                    <h4 className="google-sans text-3xl md:text-4xl font-bold text-slate-900 mb-4">Event Gallery</h4>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-lg">Explore moments of innovation, learning, and connection from professional GDG events.</p>
                  </div>
                  <div className="flex items-center gap-3 text-[var(--color-google-yellow)] font-bold text-lg mt-6 md:mt-8">
                    View Gallery <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-2">arrow_forward</span>
                  </div>
                </div>
                <div className="w-full md:w-1/2 h-64 md:h-full flex items-center justify-center md:justify-end gap-2 md:gap-6 relative mt-4 md:mt-0 px-4 md:px-0">
                  <div className="w-40 md:w-64 h-56 md:h-80 rounded-3xl overflow-hidden shadow-2xl rotate-6 translate-y-4 md:translate-y-8 z-10 transition-transform duration-700 group-hover:rotate-3 group-hover:-translate-y-2">
                    <img alt="GDG India Event Photo 1" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src={previewImages.length > 0 ? previewImages[0] : ''} />
                  </div>
                  <div className="w-40 md:w-64 h-56 md:h-80 rounded-3xl overflow-hidden shadow-2xl -rotate-6 -translate-x-6 md:-translate-x-12 relative z-0 origin-bottom transition-transform duration-700 group-hover:-rotate-12 group-hover:-translate-x-8 md:group-hover:-translate-x-16">
                    <img alt="GDG India Event Photo 2" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src={previewImages.length > 1 ? previewImages[1] : ''} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : activeTab === 'chapters' ? (
          renderChapters()
        ) : activeTab === 'events' ? (
          renderEvents()
        ) : activeTab === 'devfests' ? (
          renderDevFests()
        ) : activeTab === 'gallery' ? (
          renderGallery()
        ) : null}

        <footer className="mt-12 pt-8 pb-12 px-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/50 backdrop-blur-sm rounded-t-3xl">
          <div>
            <h5 className="google-sans text-lg font-bold text-slate-800 mb-4">Programs</h5>
            <div className="flex flex-wrap text-sm gap-x-6 gap-y-3">
              <a href="https://developers.google.com/profile" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[var(--color-google-blue)] font-medium transition-colors">Google Developer Program</a>
              <a href="https://developers.google.com/community/gdg" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[var(--color-google-green)] font-medium transition-colors">Google Developer Groups</a>
              <a href="https://developers.google.com/community/experts" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[var(--color-google-yellow)] font-medium transition-colors">Google Developer Experts</a>
              <div className="w-full md:hidden"></div>
              <a href="https://developers.google.com/community/accelerators" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[var(--color-google-red)] font-medium transition-colors">Accelerators</a>
            </div>
          </div>
          <div className="flex flex-col md:items-end mt-8 md:mt-0">
            <h5 className="google-sans text-lg font-bold text-slate-800 mb-4">Follow Us</h5>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/gdgindia/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-all border border-slate-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://twitter.com/gdgindia" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-sky-50 hover:text-sky-500 transition-all border border-slate-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="https://www.youtube.com/@gdgindia" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </main>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] w-14 h-14 bg-white border border-slate-200 text-slate-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-[var(--color-google-blue)] hover:text-[var(--color-google-blue)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
          aria-label="Scroll to top"
        >
          <span className="material-symbols-outlined text-2xl group-hover:-translate-y-1 transition-transform">arrow_upward</span>
        </button>
      )}
    </>
  );
}

export default App;
