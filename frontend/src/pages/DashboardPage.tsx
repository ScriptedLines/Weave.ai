import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  const [page, setPage] = useState(0); 

  // Advanced Filters
  const [gender, setGender] = useState<'male' | 'female' | 'unisex' | ''>('');
  const [neckStyle, setNeckStyle] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [occasion, setOccasion] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [otherDetails, setOtherDetails] = useState('');

  const [colorScore, setColorScore] = useState('0.82');
  const [semanticLabel, setSemanticLabel] = useState('Match');

  const [likedItems, setLikedItems] = useState<number[]>([]);
  const [dislikedItems, setDislikedItems] = useState<number[]>([]);

  useEffect(() => {
    // Custom Cursor Movement
    const cursor = document.getElementById('cursor');
    if (cursor) {
      const moveHandler = (e: MouseEvent) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      };
      document.addEventListener('mousemove', moveHandler);

      // Hover Effect
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
    // Subtle parallax effect on background text
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

  // Protect Route based on DNA profile
  useEffect(() => {
    if (user?.id) {
      const verifyDNA = async () => {
        const { data, error } = await supabase.from('profiles').select('skin_lab, hair_lab, liked_clothes, disliked_clothes').eq('user_id', user.id).single();
        if (error || !data || !data.skin_lab || !data.hair_lab) {
          navigate('/onboarding-dna');
        } else {
          setLikedItems(data.liked_clothes || []);
          setDislikedItems(data.disliked_clothes || []);
        }
      };
      verifyDNA();
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    if (user?.id) {
      // Re-fetch recommendations whenever gender changes, provided no search filters are active
      const hasAestheticFilters = neckStyle || colorFilter || occasion || sleeveLength || subCategory || otherDetails;
      if (!hasAestheticFilters) {
        fetchRecommendations();
      }
    }
  }, [user?.id, gender]);

  const fetchRecommendations = async () => {
    if (!user) return;
    setLoading(true);
    setRecommendedIds([]);
    setItems([]); // Clear to show skeleton
    
    // Pass current gender from sidebar to ensure For You respects the filter
    const activeGender = gender || 'unisex'; 
    
    try {
      console.log(`[CATALOGUE A]: Running Recommendations | Gender: ${activeGender}`);
      const res = await fetch(`${API_BASE}/recommend/${user.id}?gender=${activeGender}`);
      if (res.ok) {
        const data = await res.json();
        // data.recommendations is [{id, score}, ...]
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
    console.log("Loading chunk from Supabase:", chunk);
    try {
      // Normalize chunk to strings for Supabase .in() query if needed
      const normalizedChunk = chunk.map(id => String(id));
      const { data: dbItems, error } = await supabase
        .from('fashion_items')
        .select('*')
        .in('id', normalizedChunk);

      if (error) throw error;

      if (dbItems && dbItems.length > 0) {
        console.log("Details fetched from Supabase:", dbItems.length);
        const sortedDbItems = chunk
          .map(id => dbItems.find(item => String(item.id) === String(id)))
          .filter(Boolean) as FashionItem[];
        
        setItems(prev => {
            const newList = p === 0 ? sortedDbItems : [...prev, ...sortedDbItems];
            console.log("Setting items count to:", newList.length);
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
    console.log("Running fallback fetch...");
    try {
      const { data, error } = await supabase
        .from('fashion_items')
        .select('*')
        .limit(24);
      
      if (error) throw error;
      if (data) {
          console.log("Fallback items fetched:", data.length);
          setItems(data);
          // Only clear if recommendation failed
          if (items.length === 0) setRecommendedIds([]); 
      }
    } catch (err) {
      console.error("Fallback load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setItems([]); // Clear items immediately to trigger skeleton state
    
    // Strict Gender SQL Filter
    let genderFilter: string[] = [];
    if (gender === 'male') genderFilter = ['male'];
    else if (gender === 'female') genderFilter = ['female'];
    else if (gender === 'unisex') genderFilter = ['unisex'];

    try {
      console.log("Starting curate search with gender profile:", gender);
      const res = await fetch(`${API_BASE}/text_search`, {
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
          window.alert("No items found matching those specific aesthetics.");
          setLoading(false);
          // Restore items if empty
          fetchRecommendations(); 
        }
      }
    } catch (err) {
      console.error("Filter search failed:", err);
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
      window.alert("Please log in to save your preferences.");
      return;
    }
    
    const numericId = Number(itemId);
    console.log(`[AESTHETIC FEEDBACK]: ${liked ? 'Liking' : 'Disliking'} item ${numericId}`);
    
    try {
        // 1. Fetch current preference arrays
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('liked_clothes, disliked_clothes')
          .eq('user_id', user.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        const existingLiked = (profile?.liked_clothes || []).map(Number);
        const existingDisliked = (profile?.disliked_clothes || []).map(Number);
        
        // 2. Prevent duplicates and remove from opposite list if necessary
        // Also handle toggle (clicking 'like' when already liked removes the like)
        let newLiked = [...existingLiked];
        let newDisliked = [...existingDisliked];
        
        if (liked) {
          if (newLiked.includes(numericId)) {
            newLiked = newLiked.filter(id => id !== numericId); // Toggle off
          } else {
            newLiked.push(numericId); // Toggle on
            newDisliked = newDisliked.filter(id => id !== numericId); // Remove from dislike
          }
        } else {
          if (newDisliked.includes(numericId)) {
            newDisliked = newDisliked.filter(id => id !== numericId); // Toggle off
          } else {
            newDisliked.push(numericId); // Toggle on
            newLiked = newLiked.filter(id => id !== numericId); // Remove from like
          }
        }

        // Optimistic UI Update
        setLikedItems(newLiked);
        setDislikedItems(newDisliked);

        // Map arrays to Postgres strictly-formatted string literals to bypass PostgREST's bigint[] casting failures
        const pgLiked = `{${newLiked.join(',')}}`;
        const pgDisliked = `{${newDisliked.join(',')}}`;

        // 3. Atomic Update
        const { error: updateError } = await supabase.from('profiles').update({ 
          liked_clothes: pgLiked,
          disliked_clothes: pgDisliked
        }).eq('user_id', user.id);

        if (updateError) {
          console.error("Supabase Update Error Details:", updateError);
          throw updateError;
        }
        console.log("✅ Success: Aesthetic profile updated.");
        
        // Fire-and-forget sync to offload mathematical embedding synthesis to the python backend
        fetch(`${API_BASE}/sync_embedding/${user.id}`, { method: 'POST' })
            .catch(err => console.error("Background sync failed:", err));
        
    } catch (e: any) {
        console.error("❌ Like/Dislike failed:", e);
        window.alert(`Database Sync Failed: ${e.message || 'Check console'}`);
    }
  };

  const renderItems = useMemo(() => {
    if (recommendedIds.length === 0) return items;
    
    // Sort items by their rank in recommendedIds
    const sorted = recommendedIds
      .map(id => items.find(it => String(it.id) === String(id)))
      .filter(it => it !== undefined) as any[];
    
    // If we have recommended IDs but none matched our current item set, 
    // it's better to show what we have than a blank screen
    return sorted.length > 0 ? sorted : items;
  }, [items, recommendedIds]);
  // HARDCODED CARD AESTHETICS TO MATCH HTML EXACTLY
  const aesthetics = [
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[-0.5deg]",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10 -rotate-2",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuBlxOLyptUfarymgZMAu4vgoVAxGmxwl6Ppr1tkOOUWUEMSV62jNgwYXPhWW2ltGaSDmDTF8GOyfZ566rz-NxgK_sXqaueBAjs0LYCrXh_nQfOs5bagRzaGwPyfCnXCzcDWrkwH3FxYrRbkmBi4hYIe3jxVPt6c1Z8CFc01saMl8f7R-lbVO1ogbgPZp30liuhNIVqO4wQmVImp_SLGVs-fw7WcW5lzRN9_hkIK3Kcht0CXPOpWyMuOXRsIE-7Hd-E6Wjshlct7vKho",
      brandFallback: "L'Artiste Studios",
      priceFallback: "$420.00",
      nameFallback: "Wool Structured Overcoat"
    },
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[1.2deg] mt-8",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10 rotate-3",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjoDqIzTvoskX1wLnBniMNPJ1PnJUHGpVJOY_tS2MT7Af5amtmz_IZYQm3WIcfoC2UnQSftV_sp16AfZUj9zp7dP5Wp1pqUxeXuskleKf_sD5cQZ9h3l7eil-BMtG2JiqQT3Q8jSpGVXINJg163d8osQrSIrOuVjBu0Cg6YnO3dJeN1mSQ_uzJYmWlS0e3mJ5WplQwjIsqDlG-dm21b1ZNnWwzGxOSCqp_IBnmK67Mmct7jxj632SQtaTatMyXO8v8R1NxsIZu7sud",
      brandFallback: "Raw Canvas",
      priceFallback: "$185.00",
      nameFallback: "Deconstructed Denim"
    },
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[-1.5deg]",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10 -rotate-1",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrtgVrdeqTT7PHtOlXLqwwBUzaWzJDYQgN3gUXsObqpK1djih09TvPv0AKRXf8E74EUPoo2vpA2fuAb_pHqrs-J_Hz3tsGv5SLjK1l57GX5atlC3f8ywxGt6l9qoAkjyO9gkD1S85x0Rwe4hv8IQyEt-V4v6gJxYmmQjwH1g7gnyT9gljlE6hSSHt0A_iMsrZ-bQurW6Yss_ZfFOIwxlR2DTVsNLhfGJbuWVi7JSUGEgsKJjVwtNnPrki-nSVovV3idlZ8Rm2uhALH",
      brandFallback: "Atelier Mono",
      priceFallback: "$210.00",
      nameFallback: "Textured Moss Knit"
    },
    {
      outerClass: "card-tilt group bg-surface border-[1.5px] border-on-surface p-2 flex flex-col relative rotate-[0.8deg] mt-12",
      badgeClass: "absolute top-4 right-4 z-20 bg-surface-container px-2 py-0.5 border border-on-surface/10",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuANR6tLmSgPg1OzlOLcfIPiyLeqaWOSa9QjnwsXvkVr6MrAR1JNrcXkWwafBEFoBUnUSd5cuQDNEMaTbIbK35lI5xY5qPcOVMAYndnYv3h0L4VC5kwiV5MLpLXaNy7YhIN1FM5GOz5BRNMKqrEHK1ToGKZi25cd8VVHT3i9-v9l5Hv2BS8aO5ByRkw3g2c56HfD6DhHXMN_VqEw80GfRVtna_WWVM94iyN-qEVIIymnxnSAzvls4hhlctzTylipos1dNMNPTf1TxbNS",
      brandFallback: "Vault 03",
      priceFallback: "$890.00",
      nameFallback: "Matte Leather Biker"
    }
  ];

  return (
    <div className="bg-background text-on-background font-body selection:bg-primary-fixed selection:text-on-primary-fixed cursor-none min-h-screen">
      <div className="custom-cursor hidden md:block" id="cursor" style={{width:'12px', height:'12px', backgroundColor:'#a63319', borderRadius:'50%', position:'fixed', pointerEvents:'none', zIndex:9999, transform:'translate(-50%, -50%)', transition:'width 0.2s, height 0.2s'}}></div>
      
      <div className="grain-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:50, opacity:0.04, backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}}></div>

      {/* Ticker Tape */}
      <div className="fixed top-0 left-0 w-full z-[60] flex items-center overflow-hidden bg-primary h-6">
        <div className="whitespace-nowrap animate-marquee flex items-center" style={{animation: 'marquee 20s linear infinite'}}>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-surface px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-surface px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-6 h-[calc(100vh-24px)] w-[280px] bg-surface-container-low z-40 px-8 py-12 flex flex-col shadow-[20px_0_30px_rgba(26,18,8,0.03)] overflow-y-auto" style={{scrollbarWidth:'none'}}>
        <div className="mb-12 cursor-pointer" onClick={() => navigate('/')}>
          <h1 className="font-unbounded font-black text-3xl tracking-tighter flex items-center gap-2">
            WEAVE <span className="text-primary text-xl">✦</span>
          </h1>
          <p className="font-fraunces italic text-xs text-on-surface-variant opacity-60 mt-1 uppercase tracking-widest">Editorial Scrapbook</p>
        </div>

        <nav className="space-y-6 mb-12">
          <button onClick={() => navigate('/')} className="flex items-center gap-4 group w-full">
            <span className="material-symbols-outlined text-on-surface opacity-40 group-hover:opacity-100 transition-opacity">grid_view</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface opacity-60 group-hover:opacity-100 transition-opacity">Home</span>
          </button>
          <button onClick={() => navigate('/studio')} className="flex items-center gap-4 group w-full">
            <span className="material-symbols-outlined text-on-surface opacity-40 group-hover:opacity-100 transition-opacity">auto_fix_high</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface opacity-60 group-hover:opacity-100 transition-opacity">Studio</span>
          </button>
          <button className="flex items-center gap-4 group text-primary w-full">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>shelves</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] font-bold border-b border-primary/40 pb-0.5">Vault</span>
          </button>
          <button onClick={() => navigate('/docs/archive')} className="flex items-center gap-4 group w-full">
            <span className="material-symbols-outlined text-on-surface opacity-40 group-hover:opacity-100 transition-opacity">settings</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface opacity-60 group-hover:opacity-100 transition-opacity">Settings</span>
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-on-surface/5">
          <h3 className="font-unbounded font-black text-[10px] uppercase tracking-wider text-primary mb-6">Refine Results</h3>
          <div className="space-y-6 pb-12">
            
            {/* Gender Hard Filter */}
            <div className="space-y-3">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant">Gender Profile</label>
              <div className="flex gap-2">
                {(['male', 'female', 'unisex'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(gender === g ? '' : g)}
                    className={`flex-1 py-2 font-mono text-[9px] uppercase tracking-widest border transition-all ${
                      gender === g ? 'bg-on-surface text-surface border-on-surface' : 'border-on-surface/10 text-on-surface/40 hover:border-on-surface/30'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Category Filter */}
            <div className="space-y-4 pt-4 border-t border-on-surface/5">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Sub-Category</label>
              <select 
                value={subCategory} 
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full bg-transparent border-b border-on-surface/10 py-1 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
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
                placeholder="Or type custom..." 
                type="text" 
              />
            </div>

            {/* Hue / Color Filter */}
            <div className="space-y-4 pt-4 border-t border-on-surface/5">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Hue & Palette</label>
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
                      
                      // Euclidean Distance Anchor Points (Universal Color Palette)
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
                    className="w-16 h-16 rounded-sm cursor-pointer border-2 border-on-surface/20 bg-transparent transition-all hover:scale-105 hover:border-primary shrink-0 p-0 overflow-hidden"
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

            {/* Neck Style Filter */}
            <div className="space-y-4 pt-4 border-t border-on-surface/5">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Neck Architecture</label>
              <select 
                value={neckStyle} 
                onChange={(e) => setNeckStyle(e.target.value)}
                className="w-full bg-transparent border-b border-on-surface/10 py-1 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
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

            {/* Occasion Filter */}
            <div className="space-y-4 pt-4 border-t border-on-surface/5">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Occasion</label>
              <select 
                value={occasion} 
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-transparent border-b border-on-surface/10 py-1 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
              >
                <option value="">Select Occasion</option>
                <option value="Formal">Formal</option>
                <option value="Informal">Informal</option>
                <option value="Partywear">Partywear</option>
                <option value="Casual">Casual</option>
                <option value="Sport">Sport</option>
                <option value="Aesthetic">Aesthetic</option>
              </select>
              <input 
                value={occasion} 
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-transparent border-b border-on-surface/10 py-1 font-mono text-[10px] focus:outline-none focus:border-primary transition-colors placeholder:opacity-30" 
                placeholder="Or type custom..." 
                type="text" 
              />
            </div>

            {/* Sleeve Length Filter */}
            <div className="space-y-4 pt-4 border-t border-on-surface/5">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Sleeve Length</label>
              <select 
                value={sleeveLength} 
                onChange={(e) => setSleeveLength(e.target.value)}
                className="w-full bg-transparent border-b border-on-surface/10 py-1 font-fraunces italic text-sm focus:outline-none focus:border-primary appearance-none"
              >
                <option value="">Select Sleeve</option>
                <option value="Short Sleeve">Short</option>
                <option value="Long Sleeve">Long</option>
                <option value="Sleeveless">Sleeveless</option>
                <option value="Half Sleeve">Half</option>
                <option value="Cap Sleeve">Cap</option>
                <option value="3/4 Sleeve">3/4 Length</option>
              </select>
              <input 
                value={sleeveLength} 
                onChange={(e) => setSleeveLength(e.target.value)}
                className="w-full bg-transparent border-b border-on-surface/10 py-1 font-mono text-[10px] focus:outline-none focus:border-primary transition-colors placeholder:opacity-30" 
                placeholder="Or type custom..." 
                type="text" 
              />
            </div>

            {/* Additional Details */}
            <div className="space-y-3 pt-4 border-t border-on-surface/5">
              <label className="font-unbounded font-black text-[9px] uppercase tracking-tighter text-on-surface-variant block">Other Details</label>
              <textarea 
                value={otherDetails} 
                onChange={(e) => setOtherDetails(e.target.value)}
                className="w-full bg-on-surface/5 border border-on-surface/10 p-3 font-fraunces italic text-sm focus:outline-none focus:border-primary transition-colors placeholder:opacity-30 min-h-[100px] resize-none" 
                placeholder="Any other specific aesthetic details..." 
              />
            </div>

            <button onClick={handleCatalogueDiscovery} className="w-full bg-primary text-surface py-4 font-unbounded font-black text-[10px] uppercase tracking-widest relative overflow-hidden group mt-4">
              <span className="relative z-10">Curate Selection</span>
              <div className="absolute inset-0 bg-on-background translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
          <div className="mt-8 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
            <span className="font-fraunces italic text-[10px] text-secondary opacity-80">Powered by SigLIP semantic search</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[280px] pt-12 min-h-screen relative overflow-x-hidden">
        {/* Giant Background Text */}
        <div className="absolute top-20 left-10 pointer-events-none select-none overflow-hidden w-full">
          <h2 id="bg-catalogue-text" className="font-unbounded font-black text-[180px] leading-none opacity-[0.03] tracking-tighter text-on-surface" style={{transition: 'transform 0.1s ease-out'}}>CATALOGUE</h2>
        </div>

        <header className="px-12 mb-16 relative z-10 flex justify-between items-end">
          <div className="flex gap-4 overflow-x-auto" style={{scrollbarWidth:'none'}}>
            <button className="px-6 py-2 bg-on-surface text-surface rounded-full font-mono text-[10px] uppercase tracking-widest whitespace-nowrap">For You</button>
            <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors whitespace-nowrap">New Arrivals</button>
            <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-colors whitespace-nowrap">Trending</button>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-surface-container-highest border border-on-surface/5 flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase text-on-surface-variant">Color Score:</span>
              <span className="font-mono text-[9px] font-bold text-primary">{colorScore}</span>
            </div>
            <div className="px-3 py-1 bg-surface-container-highest border border-on-surface/5 flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase text-on-surface-variant">Semantic:</span>
              <span className="font-mono text-[9px] font-bold text-secondary">{semanticLabel}</span>
            </div>
          </div>
        </header>

        {/* Product Grid */}
        <section className="px-12 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
          {loading && items.length === 0 ? (
            // Skeleton Loader
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
                  <img className="w-full h-full object-cover filter contrast-[1.05] saturate-[0.95]" src={item.image_url || style.imgSrc} alt="product visual" loading="lazy" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-surface-container-low/90 backdrop-blur-sm flex flex-col items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out p-6">
                    <div className="flex gap-6 mb-8">
                      <button 
                        onClick={() => item.id && handleLike(item.id, true)} 
                        className={`material-symbols-outlined hover:scale-125 transition-all text-3xl ${likedItems.includes(Number(item.id)) ? 'text-[#8cc048]' : 'text-secondary'}`}
                        style={likedItems.includes(Number(item.id)) ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        thumb_up
                      </button>
                      <button 
                        onClick={() => item.id && handleLike(item.id, false)} 
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
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface/60">{item.brand || style.brandFallback}</span>
                    <span className="font-fraunces font-bold text-primary text-lg">{item.price || style.priceFallback}</span>
                  </div>
                  <h4 className="font-fraunces font-bold text-xl text-on-surface ink-underline inline-block">{item.cloth_name || style.nameFallback}</h4>
                </div>
              </div>
            )
          })}
        </section>

        {/* Pagination Trigger */}
        {recommendedIds.length > items.length && (
           <div className="flex justify-center pb-24">
             <button onClick={() => loadMore()} disabled={loading} className="group flex items-center gap-4 bg-transparent border border-on-surface px-8 py-4 font-unbounded font-black text-xs uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-all">
                {loading ? 'Processing...' : 'Load more items'}
                <span className="material-symbols-outlined text-sm group-hover:translate-y-1 transition-transform">south</span>
             </button>
           </div>
        )}

        {/* Floating FAB */}
        <button onClick={() => navigate('/studio')} className="fixed bottom-8 right-8 z-[100] bg-on-background text-surface w-16 h-16 rounded-sm rotate-3 hover:rotate-0 transition-transform flex items-center justify-center shadow-xl group">
          <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_a_photo</span>
        </button>
      </main>
    </div>
  );
}
