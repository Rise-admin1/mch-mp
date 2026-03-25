import { newsItems } from '../utils/newsData.js';
import { extractImageFromContent, extractDescriptionFromContent, escapeHtml } from '../utils/metaUtils.js';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

/**
 * Serves Meta Tags for News Items
 */
export const getMetaTags = (req, res, next) => {
  try {
    const { id } = req.params;
    const newsItem = newsItems.find(item => item.link === `/news/${id}`);

    if (!newsItem) {
      return res.status(404).send('News article not found');
    }

    // 1. Image Logic: Ensure it is absolute and valid
    let ogImage = extractImageFromContent(newsItem.content);
    if (!ogImage || !ogImage.startsWith('http')) {
      ogImage = 'https://i.postimg.cc/cL5MWGTh/logo.png';
    } else {
      ogImage = ogImage.split('#')[0].trim();
    }

    const description = extractDescriptionFromContent(newsItem.content) || 'Latest updates from Funyula.';
    // IMPORTANT: og:url should be the clean frontend URL the user will eventually visit
    const pageUrl = `https://funyula.com/news/${id}`;
    const pageTitle = `${newsItem.title} | Michael H. Mugenya 2027`;

    // 2. Generate Minimal HTML Shell
    // We REMOVE the <script> and <noscript> redirects because the Worker handles that.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <meta property="og:title" content="${escapeHtml(newsItem.title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Michael H. Mugenya 2027" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
</head>
<body>
  <h1>${escapeHtml(newsItem.title)}</h1>
  <p>${escapeHtml(description)}</p>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * Serves Meta Tags for Contribute Page
 */
export const getContributeMetaTags = (req, res, next) => {
  try {
    const ogImage = 'https://i.postimg.cc/cL5MWGTh/logo.png';
    const title = 'Make a Contribution';
    const description = 'Support Michael H. Mugenya 2027 by making a secure contribution via M-Pesa.';
    const pageUrl = 'https://funyula.com/contribute';
    const pageTitle = `${title} | Michael H. Mugenya 2027`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    // Get query parameters for filtering and pagination
    const { 
      status, 
      phoneNumber, 
      startDate, 
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause for filtering
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (phoneNumber) {
      where.phoneNumber = phoneNumber;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Validate sort order
    const orderBy = {};
    const validSortFields = ['createdAt', 'updatedAt', 'transactionDate', 'amount', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination
    const totalCount = await prisma.payment.count({ where });

    // Fetch payments with pagination and sorting
    const payments = await prisma.payment.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    // Calculate summary statistics
    const summary = await prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get status breakdown
    const statusBreakdown = await prisma.payment.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
      _sum: {
        amount: true,
      },
    });

    // Return response with payments and metadata
    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPreviousPage,
        },
        summary: {
          totalAmount: summary._sum.amount || 0,
          totalTransactions: summary._count.id || 0,
          statusBreakdown: statusBreakdown.map(item => ({
            status: item.status,
            count: item._count.status,
            totalAmount: item._sum.amount || 0,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching payment reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};