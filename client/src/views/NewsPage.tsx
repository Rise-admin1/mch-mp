'use client'

import { useState, useMemo } from 'react'
import { newsItems } from '../utils/newsData';
import Link from 'next/link'

const NewsPage = () => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // This would typically come from an API, but for demonstration purposes, we'll hardcode it


  const totalItems = newsItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Calculate the current page's news items
  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return newsItems.slice(startIndex, endIndex);
  }, [page, newsItems]);

  console.log(currentPageItems);
  

  // Generate pagination buttons
  const renderPaginationButtons = () => {
    const buttons = [];
    
    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`w-8 h-8 flex items-center justify-center border ${page === 1 ? 'border-gray-300 text-gray-400' : 'border-gray-300 hover:bg-gray-100'}`}
        disabled={page === 1}
        onClick={() => setPage(page > 1 ? page - 1 : 1)}
      >
        &lt;
      </button>
    );
    
    // First page
    buttons.push(
      <button
        key="1"
        className={`w-8 h-8 flex items-center justify-center border ${page === 1 ? 'border-gray-300 bg-[#263a66] text-white' : 'border-gray-300 hover:bg-gray-100'}`}
        onClick={() => setPage(1)}
      >
        1
      </button>
    );
    
    // Calculate range of pages to show
    let startPage = Math.max(2, page - 1);
    let endPage = Math.min(totalPages - 1, page + 1);
    
    // Adjust if we're near the beginning or end
    if (page <= 2) {
      endPage = Math.min(4, totalPages - 1);
    } else if (page >= totalPages - 1) {
      startPage = Math.max(totalPages - 3, 2);
    }
    
    // Add ellipsis if needed
    if (startPage > 2) {
      buttons.push(
        <span key="ellipsis1" className="px-2">...</span>
      );
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`w-8 h-8 flex items-center justify-center border ${page === i ? 'border-gray-300 bg-[#263a66] text-white' : 'border-gray-300 hover:bg-gray-100'}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      buttons.push(
        <span key="ellipsis2" className="px-2">...</span>
      );
    }
    
    // Last page (if there's more than one page)
    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          className={`w-8 h-8 flex items-center justify-center border ${page === totalPages ? 'border-gray-300 bg-[#263a66] text-white' : 'border-gray-300 hover:bg-gray-100'}`}
          onClick={() => setPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    
    // Next button
    buttons.push(
      <button
        key="next"
        className={`w-8 h-8 flex items-center justify-center border ${page === totalPages ? 'border-gray-300 text-gray-400' : 'border-gray-300 hover:bg-gray-100'}`}
        disabled={page === totalPages}
        onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
      >
        &gt;
      </button>
    );
    
    return buttons;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* Main content */}
      <div className="flex-1">
        {/* Background hero image with overlay text */}
        <div className="relative h-screen flex items-center justify-center bg-[url('https://vqj.umo.mybluehost.me/website_6d79077b/wp-content/uploads/2025/03/news.jpg')] bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center px-4 mb-2 sm:mb-4">RECENT NEWS</h1>
        </div>

          {/* <div className="absolute bottom-0 left-0 w-full py-4 px-6">
            <div className="flex items-center space-x-4">
              <span className="text-white font-medium">Follow Us</span>
              <a href="https://truthsocial.com/@realDonaldTrump" target="_blank" rel="noopener noreferrer" className="text-white">
                <img
                  src="https://ext.same-assets.com/697774200/1261798764.png"
                  alt="Truth Social"
                  className="h-6"
                />
              </a>
              <a href="https://rumble.com/c/DonaldTrump" target="_blank" rel="noopener noreferrer" className="text-white">
                <img
                  src="https://ext.same-assets.com/697774200/537585103.png"
                  alt="Rumble"
                  className="h-6"
                />
              </a>
              <a href="https://twitter.com/TrumpWarRoom" target="_blank" rel="noopener noreferrer" className="text-white">
                <img
                  src="https://ext.same-assets.com/697774200/2180659290.png"
                  alt="X"
                  className="h-6"
                />
              </a>
            </div>
          </div> */}
        </div>

        {/* Search bar */}
        {/* <div className="max-w-6xl mx-auto px-4 py-4 flex justify-end">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="border border-gray-300 p-2 pr-10 rounded"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <FaSearch />
            </div>
          </div>
        </div> */}

        {/* Recent news header */}
        <div className="max-w-6xl mx-auto px-4 flex justify-center border-b-4 border-trump-maingreen  py-8 mb-6">
          <h2 className="text-xl 2xl:text-xl font-semibold uppercase  ">
            Recent News
          </h2>
        </div>

        {/* News items list */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="space-y-6">
            {currentPageItems.map(item => (
              <Link
                key={item.id}
                href={item.link}
                className="block border-b border-gray-200 pb-6 hover:bg-gray-50 transition duration-150"
              >
                {/* <div className="text-sm text-gray-600">{item.date}</div> */}
                <h3 className="text-xl font-bold text-[#263a66]">{item.title}</h3>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center mt-8 space-x-2">
            {renderPaginationButtons()}
          </div>

          <div className="text-center text-sm text-gray-500 mt-2">
            Showing {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, totalItems)} of {totalItems}
          </div>
        </div>

        {/* Social Media Links */}
        {/* <div className="bg-gray-100 py-6">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-center space-x-6">
              <a href="" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/1261798764.png"
                  alt="Truth Social"
                  className="h-8"
                />
              </a>
              <a href="" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/537585103.png"
                  alt="Rumble"
                  className="h-8"
                />
              </a>
              <a href="" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/2180659290.png"
                  alt="X"
                  className="h-8"
                />
              </a>
              <a href="" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/1716151995/2585614386.png"
                  alt="TikTok"
                  className="h-8"
                />
              </a>
              <a href="ß" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/1290627856.png"
                  alt="Facebook"
                  className="h-8"
                />
              </a>
              <a href="" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/29643769.png"
                  alt="Instagram"
                  className="h-8"
                />
              </a>
              <a href="" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://ext.same-assets.com/697774200/1477589357.png"
                  alt="YouTube"
                  className="h-8"
                />
              </a>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default NewsPage;
