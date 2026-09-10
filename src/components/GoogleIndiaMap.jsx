import React, { useState } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { hasPlaceholderDate } from '../lib/events';

// Mapping of known GDG India cities to approximate coordinates [longitude, latitude]
// Used earlier for SVG Map, repurposing for Google Maps [latitude, longitude]
const cityCoordinates = {
    "Salem": { lat: 11.6643, lng: 78.1460 },
    "Patna": { lat: 25.5941, lng: 85.1376 },
    "Gwalior": { lat: 26.2183, lng: 78.1828 },
    "Jaipur": { lat: 26.9124, lng: 75.7873 },
    "Bhopal": { lat: 23.2599, lng: 77.4126 },
    "Nagpur": { lat: 21.1458, lng: 79.0882 },
    "Jodhpur": { lat: 26.2389, lng: 73.0243 },
    "Siliguri": { lat: 26.7271, lng: 88.4286 },
    "Nashik": { lat: 19.9975, lng: 73.7898 },
    "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "Ranchi": { lat: 23.3441, lng: 85.3096 },
    "Mumbai": { lat: 19.0760, lng: 72.8777 },
    "Surat": { lat: 21.1702, lng: 72.8311 },
    "Chandigarh": { lat: 30.7333, lng: 76.7794 },
    "Mysuru": { lat: 12.2958, lng: 76.6394 },
    "Coimbatore": { lat: 11.0168, lng: 76.9558 },
    "Hubballi": { lat: 15.3647, lng: 75.1240 },
    "Indore": { lat: 22.7196, lng: 75.8577 },
    "Kolkata": { lat: 22.5726, lng: 88.3639 },
    "Hyderabad": { lat: 17.3850, lng: 78.4867 },
    "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
    "Bangalore": { lat: 12.9716, lng: 77.5946 },
    "Chennai": { lat: 13.0827, lng: 80.2707 },
    "Delhi": { lat: 28.7041, lng: 77.1025 },
    "New Delhi": { lat: 28.6139, lng: 77.2090 },
    "Pune": { lat: 18.5204, lng: 73.8567 },
    "Madurai": { lat: 9.9252, lng: 78.1198 },
    "Rajkot": { lat: 22.3039, lng: 70.8022 },
    "Panaji": { lat: 15.4909, lng: 73.8278 },
    "Gandhinagar": { lat: 23.2156, lng: 72.6369 },
    "Kozhikode": { lat: 11.2588, lng: 75.7804 },
    "Udaipur": { lat: 24.5854, lng: 73.6828 },
    "Thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
    "Kochi": { lat: 9.9312, lng: 76.2673 },
    "Jalandhar": { lat: 31.3260, lng: 75.5762 },
    "Bhubaneswar": { lat: 20.2961, lng: 85.8245 },
    "Vadodara": { lat: 22.3072, lng: 73.1812 },
    "Jammu": { lat: 32.7266, lng: 74.8570 },
    "Lucknow": { lat: 26.8467, lng: 80.9462 },
    "Durgapur": { lat: 23.5204, lng: 87.3115 },
    "Raipur": { lat: 21.2514, lng: 81.6296 },
    "Noida": { lat: 28.5355, lng: 77.3910 },
    "Kanpur": { lat: 26.4499, lng: 80.3319 },
    "Gurugram": { lat: 28.4595, lng: 77.0266 },
    "Guwahati": { lat: 26.1445, lng: 91.7362 },
    "Dehradun": { lat: 30.3165, lng: 78.0322 },
    "Ludhiana": { lat: 30.9010, lng: 75.8573 },
    "Belagavi": { lat: 15.8497, lng: 74.5169 },
    "Aurangabad": { lat: 19.8762, lng: 75.3236 },
    "Motihari": { lat: 26.6521, lng: 84.9080 },
    "Prayagraj": { lat: 25.4358, lng: 81.8463 },
    "Vijayawada": { lat: 16.5062, lng: 80.6480 },
    "Mangaluru": { lat: 12.9141, lng: 74.8560 }
};

// `chapters` must already have past events removed (see src/lib/events.js).
const GoogleIndiaMap = ({ chapters }) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const [selectedCity, setSelectedCity] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' or 'with-events'

    // Aggregate chapters by city so we only place one pin per location, 
    // but can show multiple chapter names in an InfoWindow if needed
    const cityNodes = React.useMemo(() => {
        const map = new Map();

        chapters.forEach(chapter => {
            // Normalize names where data might be using alternatives
            let targetCity = chapter.city;
            if (targetCity === 'Trivandrum') targetCity = 'Thiruvananthapuram';
            if (targetCity === 'Hubli') targetCity = 'Hubballi';
            if (targetCity === 'Cochin') targetCity = 'Kochi';
            if (targetCity === 'Belgaum') targetCity = 'Belagavi';
            if (targetCity === 'Baroda') targetCity = 'Vadodara';
            if (targetCity === 'New Delhi') targetCity = 'Delhi';

            const coords = cityCoordinates[targetCity];
            if (coords) {
                if (!map.has(targetCity)) {
                    map.set(targetCity, {
                        city: targetCity,
                        coordinates: coords,
                        chapters: [], // Now stores objects: { name, url }
                        eventsCount: 0
                    });
                }

                const existingNode = map.get(targetCity);
                existingNode.chapters.push({
                    name: chapter.name,
                    url: chapter.url,
                    events: chapter.events
                });
                existingNode.eventsCount += chapter.events.length;
            }
        });

        return Array.from(map.values());
    }, [chapters]);

    return (
        <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
            {/* Map Filter Controls */}
            <div className="absolute top-4 left-4 right-4 sm:right-auto z-10 flex gap-2 justify-center sm:justify-start">
                <button
                    onClick={() => { setFilter('all'); setSelectedCity(null); }}
                    className={`px-4 py-2 text-xs font-bold rounded-full border shadow-md transition-all backdrop-blur ${filter === 'all' ? 'bg-white text-[var(--color-google-blue)] border-[var(--color-google-blue)] ring-4 ring-blue-50' : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'}`}
                >
                    All Chapters
                </button>
                <button
                    onClick={() => { setFilter('with-events'); setSelectedCity(null); }}
                    className={`px-4 py-2 text-xs font-bold rounded-full border shadow-md transition-all backdrop-blur flex items-center gap-2 ${filter === 'with-events' ? 'bg-white text-[var(--color-google-green)] border-[var(--color-google-green)] ring-4 ring-green-50' : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'}`}
                >
                    <span className={`w-2 h-2 rounded-full ${filter === 'with-events' ? 'bg-[var(--color-google-green)] animate-pulse' : 'bg-slate-400'}`}></span>
                    Upcoming Events
                </button>
            </div>

            <APIProvider apiKey={apiKey || ''}>
                <GoogleMap
                    defaultZoom={4.2}
                    defaultCenter={{ lat: 21.0, lng: 79.5 }}
                    mapId="e52a48bd6caea528" // Minimal silver styling (use any map ID)
                    disableDefaultUI={true}
                    gestureHandling={'greedy'}
                    className="w-full h-full rounded-xl overflow-hidden"
                >
                    {cityNodes.filter(node => filter === 'all' || node.eventsCount > 0).map((cityNode) => (
                        <AdvancedMarker
                            key={cityNode.city}
                            position={cityNode.coordinates}
                            title={cityNode.city}
                            onClick={() => setSelectedCity(cityNode)}
                        >
                            <Pin
                                background={cityNode.eventsCount > 0 ? 'var(--color-google-green)' : 'var(--color-google-blue)'}
                                borderColor={cityNode.eventsCount > 0 ? '#10b981' : '#3b82f6'}
                                glyphColor="#FFF"
                            />
                        </AdvancedMarker>
                    ))}
                </GoogleMap>

                {selectedCity && (
                    <InfoWindow
                        position={selectedCity.coordinates}
                        onCloseClick={() => setSelectedCity(null)}
                        headerContent={null}
                    >
                        <div className="text-center p-2 text-slate-800 flex flex-col items-center">
                            <strong className="block text-sm font-bold text-slate-900 mb-1">{selectedCity.city}</strong>
                            <div className="text-[10px] text-slate-500 mb-2 font-medium">
                                GDG Presence
                            </div>

                            {selectedCity.eventsCount > 0 && (
                                <div className="mb-3 mt-1 text-[10px] font-bold text-[var(--color-google-green)] bg-green-50 px-2.5 py-1 rounded-full border border-green-100 shadow-sm inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-google-green)] animate-pulse"></span>
                                    {selectedCity.eventsCount} Upcoming Event{selectedCity.eventsCount > 1 ? 's' : ''}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5 w-full min-w-[140px]">
                                {selectedCity.chapters.map((chap, idx) => (
                                    <a
                                        key={idx}
                                        href={chap.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-[var(--color-google-blue)] bg-blue-50 border border-blue-100 hover:bg-[var(--color-google-blue)] hover:text-white transition-all px-3 py-1.5 rounded-xl flex flex-col gap-0.5 group w-full"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold uppercase tracking-wider truncate max-w-[100px] text-left">{chap.name}</span>
                                            <span className="material-symbols-outlined text-[12px] opacity-50 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                        </div>
                                        {chap.events && chap.events.length > 0 && (
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <div className="text-[10px] text-slate-700 font-semibold group-hover:text-white line-clamp-2 text-left w-full leading-tight">
                                                    {chap.events[0].title}
                                                </div>
                                                <div className="text-[9px] text-slate-500 group-hover:text-blue-100 font-medium text-left flex items-center gap-1 w-full truncate">
                                                    <span className="material-symbols-outlined text-[10px]">event</span>
                                                    {hasPlaceholderDate(chap.events[0])
                                                        ? 'Date to be announced'
                                                        : new Date(chap.events[0].start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </APIProvider>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-white/90 backdrop-blur rounded-lg p-3 shadow-md border border-slate-200 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--color-google-green)] ring-2 ring-green-100 shadow-sm block"></span>
                    <span className="text-xs font-semibold text-slate-700">Upcoming Events</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--color-google-blue)] ring-2 ring-blue-100 shadow-sm block"></span>
                    <span className="text-xs font-semibold text-slate-700">No Events Scheduled</span>
                </div>
            </div>
        </div>
    );
};

export default GoogleIndiaMap;
