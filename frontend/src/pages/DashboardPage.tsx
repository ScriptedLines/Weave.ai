import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { useStudioFilters } from '../components/Layout';

interface FashionItem {
  id: string;
  cloth_name?: string;
  category?: string;
  image_url?: string;
  brand?: string;
  price?: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<FashionItem[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(0);

  const [gender, setGender] = useState<'male' | 'female' | 'unisex' | ''>('');
  const [neckStyle, setNeckStyle] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [occasion, setOccasion] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const { filterOpen: filterDrawerOpen, setFilterOpen: setFilterDrawerOpen } = useStudioFilters();
  const filterPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!filterDrawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    filterPanelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setFilterDrawerOpen(false); return; }
      if (event.key !== 'Tab') return;
      const items = filterPanelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [filterDrawerOpen]);

  const activeFilterCount = useMemo(() => {
    return [gender, neckStyle, colorFilter, occasion, sleeveLength, subCategory, otherDetails].filter(Boolean).length;
  }, [gender, neckStyle, colorFilter, occasion, sleeveLength, subCategory, otherDetails]);

  const [colorScore, setColorScore] = useState('0.82');
  const [semanticLabel, setSemanticLabel] = useState('Match');

  const [likedItems, setLikedItems] = useState<number[]>([]);
  const [dislikedItems, setDislikedItems] = useState<number[]>([]);
  const likedItemsRef = useRef<number[]>([]);
  const dislikedItemsRef = useRef<number[]>([]);

  useEffect(() => {

    const cursor = document.getElementById('cursor');
    if (cursor) {
      const moveHandler = (e: MouseEvent) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      };
      document.addEventListener('mousemove', moveHandler);

      const clickables = document.querySelectorAll('a, button, input, select');
      const enterHandler = () => {
        cursor.style.width = '32px';
        cursor.style.height = '32px';
        cursor.style.backgroundColor = 'transparent';
        cursor.style.border = '1px solid #a63319';
      };
      const leaveHandler = () => {
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        cursor.style.backgroundColor = '#a63319';
        cursor.style.border = 'none';
      };

      clickables.forEach(el => {
        el.addEventListener('mouseenter', enterHandler);
        el.addEventListener('mouseleave', leaveHandler);
      });

      return () => {
        document.removeEventListener('mousemove', moveHandler);
        clickables.forEach(el => {
          el.removeEventListener('mouseenter', enterHandler);
          el.removeEventListener('mouseleave', leaveHandler);
        });
      };
    }
  }, []);

  useEffect(() => {

    const scrollHandler = () => {
      const scrolled = window.pageYOffset;
      const catalogueText = document.getElementById('bg-catalogue-text');
      if (catalogueText) {
        catalogueText.style.transform = `translateX(${scrolled * 0.1}px)`;
      }
    };
    document.addEventListener('scroll', scrollHandler);
    return () => document.removeEventListener('scroll', scrollHandler);
  }, []);

  useEffect(() => {
    if (user?.id) {
      const verifyDNA = async () => {
        const response = await apiFetch('/profile');
        const data = response.ok ? await response.json() : null;
        if (!data?.profile?.skin_lab || !data?.profile?.hair_lab) {
          navigate('/onboarding-dna');
        } else {
          const liked = (data.profile.liked_clothes || []).map(Number);
          const disliked = (data.profile.disliked_clothes || []).map(Number);
          likedItemsRef.current = liked;
          dislikedItemsRef.current = disliked;
          setLikedItems(liked);
          setDislikedItems(disliked);
        }
      };
      verifyDNA();
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    if (user?.id) {

      const hasAestheticFilters = neckStyle || colorFilter || occasion || sleeveLength || subCategory || otherDetails;
      if (!hasAestheticFilters) {
        fetchRecommendations();
      }
    }
  }, [user?.id, gender]);

  const fetchRecommendations = async () => {
    if (!user) return;
    setNotice('');
    setLoading(true);
    setRecommendedIds([]);
    setItems([]);

    const activeGender = gender;
    const genderQuery = activeGender ? `?gender=${encodeURIComponent(activeGender)}` : '';

    try {
      const res = await apiFetch(`/recommend${genderQuery}`);
      if (res.ok) {
        const data = await res.json();

        const ids = (data.recommendations || []).map((r: any) => r[0]);
        setRecommendedIds(ids);

        if (data.weights) {
           setColorScore(data.weights.color?.toFixed(2));
           setSemanticLabel("PERSONALIZED");
        }

        if (ids.length > 0) {
          await loadMore(ids, 0);
        } else {
          await fallbackFetch();
        }
      }
    } catch (err) {
      console.error("Fetch recommendations error:", err);
      await fallbackFetch();
    } finally {
        setLoading(false);
    }
  };

  const loadMore = async (allIds?: string[], currentPage?: number) => {
    const ids = allIds || recommendedIds;
    const p = currentPage !== undefined ? currentPage : page;
    const chunk = ids.slice(p * 100, (p + 1) * 100);

    if (chunk.length === 0) return;

    setLoading(true);
    try {
      const normalizedChunk = chunk.map(id => String(id));
      const response = await apiFetch(`/items?ids=${encodeURIComponent(normalizedChunk.join(','))}`);
      if (!response.ok) throw new Error('Failed to load items');
      const dbItems: FashionItem[] = await response.json();

      if (dbItems && dbItems.length > 0) {
        const itemMap = new Map(dbItems.map(item => [String(item.id), item]));
        const sortedDbItems = chunk
          .map(id => itemMap.get(String(id)))
          .filter(Boolean) as FashionItem[];

        setItems(prev => {
            const newList = p === 0 ? sortedDbItems : [...prev, ...sortedDbItems];
            return newList;
        });
        setPage(p + 1);
      } else {
        console.warn("No items found in DB for chunk:", chunk);
        if (p === 0) await fallbackFetch();
      }
    } catch (err) {
      console.error("Load more failed:", err);
      if (p === 0) await fallbackFetch();
    } finally {
      setLoading(false);
    }
  };

  const fallbackFetch = async () => {
    try {
      const response = await apiFetch('/items?limit=24');
      if (!response.ok) throw new Error('Failed to load fallback items');
      const data: FashionItem[] = await response.json();
      setItems(data);
      setRecommendedIds([]);
    } catch (err) {
      console.error("Fallback load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setNotice('');
    setLoading(true);
    setItems([]);

    let genderFilter: string[] = [];
    if (gender === 'male') genderFilter = ['male'];
    else if (gender === 'female') genderFilter = ['female'];
    else if (gender === 'unisex') genderFilter = ['unisex'];

    try {
      console.log("Starting curate search with gender profile:", gender);
      const res = await apiFetch('/text_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender_filter: genderFilter.length > 0 ? genderFilter : null,
          neck_style: neckStyle || null,
          color: colorFilter || null,
          occasion: occasion || null,
          sleeve_length: sleeveLength || null,
          sub_category: subCategory || null,
          additional_input: otherDetails || null
        })
      });

      if (!res.ok) throw new Error('Search unavailable');
      if (res.ok) {
        const data = await res.json();
        const sortedIds = Object.keys(data);
        console.log(`Curate Search returned ${sortedIds.length} items`);

        if (sortedIds.length > 0) {
          setRecommendedIds(sortedIds);
          setColorScore("1.0");
          setSemanticLabel("AI Filtered");
          await loadMore(sortedIds, 0);
        } else {
          setNotice('No items matched those filters. Try changing your selection.');
          setRecommendedIds([]);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Filter search failed:", err);
      setNotice('Search is unavailable right now. Please try again.');
      setLoading(false);
    }
  };

  const handleCatalogueDiscovery = () => {
    const hasAestheticFilters = neckStyle || colorFilter || occasion || sleeveLength || subCategory || otherDetails;
    if (hasAestheticFilters) {
      console.log("[CATALOGUE B]: Active Aesthetic Filters | Switching to SigLIP Search");
      handleSearch();
    } else {
      console.log("[CATALOGUE A]: No Aesthetic Filters | Running Weighted Recommendations");
      fetchRecommendations();
    }
  };

  const handleLike = async (itemId: string | number, liked: boolean) => {
    if (!user) {
      setNotice('Please sign in to save your preferences.');
      return;
    }

    const numericId = Number(itemId);
    console.log(`[AESTHETIC FEEDBACK]: ${liked ? 'Liking' : 'Disliking'} item ${numericId}`);

    const previousLiked = [...likedItemsRef.current];
    const previousDisliked = [...dislikedItemsRef.current];

    try {
        let newLiked = [...previousLiked];
        let newDisliked = [...previousDisliked];

        if (liked) {
          if (newLiked.includes(numericId)) {
            newLiked = newLiked.filter(id => id !== numericId);
          } else {
            newLiked.push(numericId);
            newDisliked = newDisliked.filter(id => id !== numericId);
          }
        } else {
          if (newDisliked.includes(numericId)) {
            newDisliked = newDisliked.filter(id => id !== numericId);
          } else {
            newDisliked.push(numericId);
            newLiked = newLiked.filter(id => id !== numericId);
          }
        }

        likedItemsRef.current = newLiked;
        dislikedItemsRef.current = newDisliked;
        setLikedItems(newLiked);
        setDislikedItems(newDisliked);

        const updateResponse = await apiFetch('/profile/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            liked_clothes: newLiked,
            disliked_clothes: newDisliked,
          }),
        });

        if (!updateResponse.ok) {
          likedItemsRef.current = previousLiked;
          dislikedItemsRef.current = previousDisliked;
          setLikedItems(previousLiked);
          setDislikedItems(previousDisliked);
          throw new Error('Preference sync failed.');
        }

        apiFetch('/sync_embedding', { method: 'POST' })
            .catch(err => console.error("Background sync failed:", err));

    } catch (e: any) {
        console.error("❌ Like/Dislike failed:", e);
        likedItemsRef.current = previousLiked;
        dislikedItemsRef.current = previousDisliked;
        setLikedItems(previousLiked);
        setDislikedItems(previousDisliked);
        setNotice('Could not save your preference. Please try again.');
    }
  };

  const renderItems = useMemo(() => {
    if (recommendedIds.length === 0) return items;

    const itemMap = new Map(items.map(item => [String(item.id), item]));
    const sorted = recommendedIds
      .map(id => itemMap.get(String(id)))
      .filter((item): item is FashionItem => item !== undefined);

    return sorted.length > 0 ? sorted : items;
  }, [items, recommendedIds]);

  const aesthetics = [
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[-0.5deg]",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10 -rotate-2",
    },
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[1.2deg] mt-8",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10 rotate-3",
    },
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[-1.5deg]",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10 -rotate-1",
    },
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[0.8deg] mt-12",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10",
    }
  ];

  return (
    <>
      <div className="absolute top-24 left-10 pointer-events-none select-none overflow-hidden w-full z-0">
        <h2 id="bg-catalogue-text" className="font-unbounded font-black text-[140px] md:text-[180px] leading-none opacity-[0.03] tracking-tighter text-on-surface" style={{transition: 'transform 0.1s ease-out'}}>
          DISCOVER
        </h2>
      </div>

      {filterDrawerOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setFilterDrawerOpen(false)}
        />
      )}

      <aside
        id="catalogue-filters"
        ref={filterPanelRef}
        role="dialog"
        aria-modal={filterDrawerOpen ? true : undefined}
        aria-label="Refine results"
        aria-hidden={!filterDrawerOpen}
        inert={!filterDrawerOpen}
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-full sm:w-[380px] bg-paper border-r border-ink/10 shadow-2xl z-[60] flex flex-col transition-transform duration-300 ease-in-out ${
          filterDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-ink/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rust">tune</span>
            <h3 className="font-unbounded font-black text-xs uppercase tracking-wider text-ink">
              Filters
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setGender('');
                  setSubCategory('');
                  setColorFilter('');
                  setNeckStyle('');
                  setOccasion('');
                  setSleeveLength('');
                  setOtherDetails('');
                  fetchRecommendations();
                }}
                className="font-mono text-[9px] uppercase tracking-widest text-rust hover:underline"
              >
                Reset All
              </button>
            )}
            <button
              onClick={() => setFilterDrawerOpen(false)}
              aria-label="Close filters"
              className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-ink/5 text-ink/60 hover:text-ink transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-3">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Gender</label>
            <div className="flex gap-2">
              {(['male', 'female', 'unisex'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(gender === g ? '' : g)}
                  className={`flex-1 py-2 font-mono text-[9px] uppercase tracking-widest border rounded-sm transition-all ${
                    gender === g ? 'bg-on-surface text-surface border-on-surface' : 'border-on-surface/10 text-on-surface/40 hover:border-on-surface/30'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-on-surface/5">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Category</label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="w-full bg-transparent border-b border-on-surface/10 py-1.5 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">Select Category</option>
              <option value="T-shirts">T-shirts</option>
              <option value="Blouses">Blouses</option>
              <option value="Shirts">Shirts</option>
              <option value="Hoodies">Hoodies</option>
              <option value="Sweatshirts">Sweatshirts</option>
              <option value="Tanks">Tanks</option>
              <option value="Sweaters">Sweaters</option>
              <option value="Polos">Polos</option>
              <option value="Vests">Vests</option>
            </select>
            <input
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="w-full bg-transparent border-b border-on-surface/10 py-1 font-mono text-[10px] focus:outline-none focus:border-primary transition-colors placeholder:opacity-30"
              placeholder="Or type custom category..."
              type="text"
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-on-surface/5">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Color</label>
            <div className="flex gap-4 items-center">
              <div className="relative group/color">
                <input
                  type="color"
                  value={colorFilter.startsWith('#') ? colorFilter : '#a63319'}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);

                    const anchors = [
                      { name: 'Red', r: 255, g: 0, b: 0 },
                      { name: 'Green', r: 0, g: 255, b: 0 },
                      { name: 'Blue', r: 0, g: 0, b: 255 },
                      { name: 'Yellow', r: 255, g: 255, b: 0 },
                      { name: 'Cyan', r: 0, g: 255, b: 255 },
                      { name: 'Pink', r: 255, g: 0, b: 255 },
                      { name: 'Orange', r: 255, g: 165, b: 0 },
                      { name: 'Purple', r: 128, g: 0, b: 128 },
                      { name: 'Brown', r: 139, g: 69, b: 19 },
                      { name: 'White', r: 255, g: 255, b: 255 },
                      { name: 'Black', r: 0, g: 0, b: 0 },
                      { name: 'Grey', r: 128, g: 128, b: 128 },
                      { name: 'Teal', r: 0, g: 128, b: 128 },
                      { name: 'Maroon', r: 128, g: 0, b: 0 },
                      { name: 'Navy', r: 0, g: 0, b: 128 },
                      { name: 'Gold', r: 255, g: 215, b: 0 },
                      { name: 'Sage', r: 156, g: 175, b: 136 },
                      { name: 'Beige', r: 245, g: 245, b: 220 }
                    ];

                    let bestMatch = anchors[0].name;
                    let minDistance = Infinity;

                    anchors.forEach(anchor => {
                      const dist = Math.sqrt(
                        Math.pow(r - anchor.r, 2) +
                        Math.pow(g - anchor.g, 2) +
                        Math.pow(b - anchor.b, 2)
                      );
                      if (dist < minDistance) {
                        minDistance = dist;
                        bestMatch = anchor.name;
                      }
                    });

                    setColorFilter(bestMatch);
                  }}
                  className="w-14 h-14 rounded-sm cursor-pointer border-2 border-on-surface/20 bg-transparent transition-all hover:scale-105 hover:border-primary shrink-0 p-0 overflow-hidden"
                  title="Choose visual hue"
                />
                <div className="absolute inset-0 pointer-events-none border border-white/20 mix-blend-overlay"></div>
              </div>
              <div className="flex-1 space-y-1">
                <input
                  value={colorFilter}
                  onChange={(e) => setColorFilter(e.target.value)}
                  className="w-full bg-transparent border-b border-on-surface/10 py-1 font-fraunces italic text-base focus:outline-none focus:border-primary transition-colors placeholder:opacity-30"
                  placeholder="Type name (e.g. Sage)..."
                  type="text"
                />
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant opacity-40">Translates hue to name</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-on-surface/5">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Neckline</label>
            <select
              value={neckStyle}
              onChange={(e) => setNeckStyle(e.target.value)}
              className="w-full bg-transparent border-b border-on-surface/10 py-1.5 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">Select Neck Style</option>
              <option value="V-Neck">V-Neck</option>
              <option value="Turtleneck">Turtleneck</option>
              <option value="Crew Neck">Crew Neck</option>
              <option value="Scoop Neck">Scoop Neck</option>
              <option value="Hooded">Hooded</option>
              <option value="Collared">Collared</option>
              <option value="Boat Neck">Boat Neck</option>
              <option value="Off-shoulder">Off-shoulder</option>
            </select>
            <input
              value={neckStyle}
              onChange={(e) => setNeckStyle(e.target.value)}
              className="w-full bg-transparent border-b border-on-surface/10 py-1 font-mono text-[10px] focus:outline-none focus:border-primary transition-colors placeholder:opacity-30"
              placeholder="Or type custom..."
              type="text"
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-on-surface/5">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Occasion</label>
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="w-full bg-transparent border-b border-on-surface/10 py-1.5 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">Select Occasion</option>
              <option value="Formal">Formal</option>
              <option value="Informal">Informal</option>
              <option value="Partywear">Partywear</option>
              <option value="Casual">Casual</option>
              <option value="Sport">Sport</option>
              <option value="Aesthetic">Aesthetic</option>
            </select>
          </div>

          <div className="space-y-3 pt-4 border-t border-on-surface/5">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Sleeve Length</label>
            <select
              value={sleeveLength}
              onChange={(e) => setSleeveLength(e.target.value)}
              className="w-full bg-transparent border-b border-on-surface/10 py-1.5 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">Select Sleeve</option>
              <option value="Short Sleeve">Short</option>
              <option value="Long Sleeve">Long</option>
              <option value="Sleeveless">Sleeveless</option>
              <option value="Half Sleeve">Half</option>
              <option value="Cap Sleeve">Cap</option>
              <option value="3/4 Sleeve">3/4 Length</option>
            </select>
          </div>

          <div className="space-y-3 pt-4 border-t border-on-surface/5">
            <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Additional details</label>
            <textarea
              value={otherDetails}
              onChange={(e) => setOtherDetails(e.target.value)}
              className="w-full bg-on-surface/5 border border-on-surface/10 p-3 font-fraunces italic text-sm focus:outline-none focus:border-primary transition-colors placeholder:opacity-30 min-h-[90px] resize-none rounded-sm"
              placeholder="Describe the style you are looking for"
            />
          </div>
        </div>

        <div className="p-6 border-t border-ink/10 bg-paper">
          <button
            onClick={() => {
              handleCatalogueDiscovery();
              setFilterDrawerOpen(false);
            }}
            className="w-full bg-primary text-surface py-3.5 font-unbounded font-black text-[10px] uppercase tracking-widest relative overflow-hidden group shadow-md rounded-sm"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Apply filters
            </span>
            <div className="absolute inset-0 bg-on-background translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </aside>

      <div className="px-6 md:px-12 py-8 min-h-screen relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-ink/10 pb-6">
          <div className="flex items-center gap-3 overflow-x-auto" style={{scrollbarWidth:'none'}}>
            <span className="px-6 py-2 bg-on-surface text-surface rounded-full font-mono text-[10px] uppercase tracking-widest whitespace-nowrap shadow-sm">
              For You
            </span>

          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-surface-container-highest border border-on-surface/5 flex items-center gap-2 rounded-sm">
              <span className="font-mono text-[9px] uppercase text-on-surface-variant">Color Score:</span>
              <span className="font-mono text-[9px] font-bold text-primary">{colorScore}</span>
            </div>
            <div className="px-3 py-1.5 bg-surface-container-highest border border-on-surface/5 flex items-center gap-2 rounded-sm">
              <span className="font-mono text-[9px] uppercase text-on-surface-variant">Semantic:</span>
              <span className="font-mono text-[9px] font-bold text-secondary">{semanticLabel}</span>
            </div>
          </div>
        </header>

        {notice && <p role="status" className="mb-6 border border-rust/30 bg-paper px-4 py-3 font-mono text-xs text-rust">{notice}</p>}

        <section aria-label="Clothing results" aria-busy={loading} className="px-6 sm:px-12 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
          {loading && items.length === 0 ? (

            Array.from({length: 8}).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col space-y-4">
                <div className="aspect-[3/4] bg-on-surface/5 rounded-sm"></div>
                <div className="h-4 bg-on-surface/5 rounded w-1/2"></div>
                <div className="h-4 bg-on-surface/5 rounded w-3/4"></div>
              </div>
            ))
          ) : renderItems.map((item, i) => {
            const style = aesthetics[i % 4];
            return (
              <div key={item.id} className={style.outerClass} style={{transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)', transformStyle: 'preserve-3d'}} onMouseEnter={(e) => e.currentTarget.style.transform = e.currentTarget.style.transform.replace(/rotate\([^)]+\)/, '') + ' perspective(1000px) rotateX(2deg) rotateY(-2deg) scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = e.currentTarget.style.transform.replace(/perspective\([^)]+\) rotateX\([^)]+\) rotateY\([^)]+\) scale\([^)]+\)/, '')}>
                <div className={style.badgeClass}>
                  <span className="font-unbounded font-black text-[8px] uppercase">WEAVE ✦</span>
                </div>
                <div className="aspect-[3/4] overflow-hidden bg-surface-container-high relative">
                  {item.image_url ? <img className="w-full h-full object-cover filter contrast-[1.05] saturate-[0.95]" src={item.image_url} alt={item.cloth_name || 'Clothing item'} loading="lazy" /> : <div className="h-full flex items-center justify-center font-mono text-xs text-ink/50">Image unavailable</div>}

                  <div data-catalogue-actions className="absolute inset-0 bg-surface-container-low/90 backdrop-blur-sm flex flex-col items-center justify-center translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-200 ease-out p-6">
                    <div className="flex gap-6 mb-8">
                      <button
                        onClick={() => item.id && handleLike(item.id, true)}
                        aria-label={`Like ${item.cloth_name || 'garment'}`}
                        aria-pressed={likedItems.includes(Number(item.id))}
                        className={`material-symbols-outlined hover:scale-125 transition-all text-3xl ${likedItems.includes(Number(item.id)) ? 'text-[#8cc048]' : 'text-secondary'}`}
                        style={likedItems.includes(Number(item.id)) ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        thumb_up
                      </button>
                      <button
                        onClick={() => item.id && handleLike(item.id, false)}
                        aria-label={`Dislike ${item.cloth_name || 'garment'}`}
                        aria-pressed={dislikedItems.includes(Number(item.id))}
                        className={`material-symbols-outlined hover:scale-125 transition-all text-3xl ${dislikedItems.includes(Number(item.id)) ? 'text-[#C84B2F]' : 'text-primary'}`}
                        style={dislikedItems.includes(Number(item.id)) ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        thumb_down
                      </button>
                    </div>
                    <button onClick={() => navigate(item.id ? `/studio?cloth_id=${item.id}` : '/studio')} className="w-full border-2 border-on-surface py-3 font-unbounded font-black text-[11px] uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-colors flex items-center justify-center gap-2">
                        Try On <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
                <div className="py-4 px-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface/60">{item.brand || item.category || 'Clothing'}</span>
                    {item.price && <span className="font-fraunces font-bold text-primary text-lg">{item.price}</span>}
                  </div>
                  <h4 className="font-fraunces font-bold text-xl text-on-surface ink-underline inline-block">{item.cloth_name || 'Clothing item'}</h4>
                </div>
              </div>
            )
          })}
        </section>

        {recommendedIds.length > items.length && (
           <div className="flex justify-center pb-24">
             <button onClick={() => loadMore()} disabled={loading} className="group flex items-center gap-4 bg-transparent border border-on-surface px-8 py-4 font-unbounded font-black text-xs uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-all">
                {loading ? 'Processing...' : 'Load more items'}
                <span className="material-symbols-outlined text-sm group-hover:translate-y-1 transition-transform">south</span>
             </button>
           </div>
        )}

        <button onClick={() => navigate('/studio')} className="fixed bottom-8 right-8 z-[40] bg-rust text-paper w-14 h-14 rounded-sm rotate-3 hover:rotate-0 transition-transform flex items-center justify-center shadow-xl group active:scale-95" title="Go to Virtual Try-On Studio">
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">add_a_photo</span>
        </button>
      </div>
    </>
  );
}
