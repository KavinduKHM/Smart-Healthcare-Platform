import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDoctorReviewAnalytics } from '../../services/appointmentService';
import './AdminReviewsPage.css';

const BAR_COLORS = ['#127A73', '#2F80ED', '#F29D35', '#6C5CE7', '#00A5CF'];
const PIE_COLORS = ['#8B5CF6', '#5D8BF4', '#2CB67D', '#F4A261', '#E76F51'];

const AdminReviewsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    overallAverageRating: 0,
    doctors: [],
    ratingDistribution: [],
    monthlyTrend: [],
  });

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDoctorReviewAnalytics();
      const payload = response?.data || {};
      setAnalytics({
        totalReviews: Number(payload?.totalReviews || 0),
        overallAverageRating: Number(payload?.overallAverageRating || 0),
        doctors: Array.isArray(payload?.doctors) ? payload.doctors : [],
        ratingDistribution: Array.isArray(payload?.ratingDistribution) ? payload.ratingDistribution : [],
        monthlyTrend: Array.isArray(payload?.monthlyTrend) ? payload.monthlyTrend : [],
      });
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to load review analytics.';
      setError(message);
      setAnalytics({
        totalReviews: 0,
        overallAverageRating: 0,
        doctors: [],
        ratingDistribution: [],
        monthlyTrend: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const topDoctors = useMemo(() => {
    return [...analytics.doctors]
      .sort((a, b) => Number(b?.averageRating || 0) - Number(a?.averageRating || 0))
      .slice(0, 8)
      .map((doctor, index) => ({
        name: doctor?.doctorName || `Doctor ${doctor?.doctorId}`,
        specialty: doctor?.doctorSpecialty || 'Unknown',
        averageRating: Number(doctor?.averageRating || 0),
        reviewCount: Number(doctor?.reviewCount || 0),
        color: BAR_COLORS[index % BAR_COLORS.length],
      }));
  }, [analytics.doctors]);

  const distribution = useMemo(() => {
    return analytics.ratingDistribution.map((item, index) => ({
      label: `${item.rating} Star`,
      value: Number(item.count || 0),
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [analytics.ratingDistribution]);

  const trend = useMemo(() => {
    return analytics.monthlyTrend.map((item) => ({
      month: item.month,
      reviews: Number(item.reviewCount || 0),
      avgRating: Number(item.averageRating || 0),
    }));
  }, [analytics.monthlyTrend]);

  return (
    <div className="adminReviewsRoot">
      <section className="card adminReviewsHeader">
        <div>
          <h1 className="cardTitle">Reviews Analytics</h1>
          <p className="muted">Monitor doctor rating distribution and review momentum over time.</p>
        </div>
        <button type="button" onClick={loadAnalytics} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="adminReviewsStats">
        <article className="card adminReviewsStatCard">
          <h3>Total Reviews</h3>
          <p>{analytics.totalReviews}</p>
        </article>
        <article className="card adminReviewsStatCard">
          <h3>Overall Average Rating</h3>
          <p>{analytics.overallAverageRating.toFixed(2)} / 5</p>
        </article>
        <article className="card adminReviewsStatCard">
          <h3>Doctors With Reviews</h3>
          <p>{analytics.doctors.length}</p>
        </article>
      </section>

      {error ? <div className="adminReviewsError">{error}</div> : null}

      <section className="adminReviewsCharts">
        <article className="card adminReviewsChartCard">
          <h3>Rating Distribution</h3>
          {distribution.length === 0 ? (
            <p className="muted">No rating data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={95} label>
                  {distribution.map((entry, index) => (
                    <Cell key={`dist-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="card adminReviewsChartCard">
          <h3>Review Trend Over Time</h3>
          {trend.length === 0 ? (
            <p className="muted">No trend data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
                <XAxis dataKey="month" stroke="#54657b" />
                <YAxis yAxisId="left" allowDecimals={false} stroke="#54657b" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} stroke="#54657b" />
                <Tooltip />
                <Area yAxisId="left" type="monotone" dataKey="reviews" stroke="#127A73" fill="#A8E6CF" fillOpacity={0.65} />
                <Area yAxisId="right" type="monotone" dataKey="avgRating" stroke="#2F80ED" fill="#BFD7FF" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="card adminReviewsChartCard adminReviewsWideCard">
          <h3>Top Rated Doctors</h3>
          {topDoctors.length === 0 ? (
            <p className="muted">No doctor review records available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topDoctors} layout="vertical" margin={{ top: 8, right: 20, left: 30, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
                <XAxis type="number" domain={[0, 5]} stroke="#54657b" />
                <YAxis type="category" dataKey="name" width={130} stroke="#54657b" />
                <Tooltip
                  formatter={(value, key) => {
                    if (key === 'averageRating') return [`${Number(value).toFixed(2)} / 5`, 'Average Rating'];
                    if (key === 'reviewCount') return [value, 'Review Count'];
                    return [value, key];
                  }}
                />
                <Bar dataKey="averageRating" radius={[0, 8, 8, 0]}>
                  {topDoctors.map((entry, index) => (
                    <Cell key={`doctor-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>
      </section>
    </div>
  );
};

export default AdminReviewsPage;
