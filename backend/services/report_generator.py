"""
PDF Report Generator for Morning Trading Reports
"""

from datetime import datetime, timezone
from typing import Dict, Any
import io
import base64


def generate_morning_report_pdf(report: Dict) -> bytes:
    """Generate a PDF morning report"""
    
    # Using reportlab for PDF generation
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    except ImportError:
        # Return HTML-based report if reportlab not available
        return generate_html_report(report).encode('utf-8')
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#10b981'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=15,
        spaceAfter=10
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569')
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph("🌅 Morning Trading Report", title_style))
    elements.append(Paragraph(report['market_date'], ParagraphStyle(
        'Date', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.grey
    )))
    elements.append(Spacer(1, 20))
    
    # Executive Summary
    sentiment = report.get('executive_summary', {}).get('sentiment', {})
    elements.append(Paragraph("📊 Market Sentiment", section_style))
    
    sentiment_color = colors.green if 'bullish' in sentiment.get('overall', '') else colors.red if 'bearish' in sentiment.get('overall', '') else colors.grey
    
    summary_data = [
        ['Overall Sentiment', sentiment.get('overall', 'N/A').upper()],
        ['Confidence', sentiment.get('confidence', 'N/A')],
        ['VIX Level', f"{sentiment.get('vix_level', 'N/A')} ({sentiment.get('vix_sentiment', '')})"],
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 4*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 10))
    
    # Recommendation
    elements.append(Paragraph(f"💡 <i>{sentiment.get('recommendation', '')}</i>", normal_style))
    elements.append(Spacer(1, 15))
    
    # Futures
    elements.append(Paragraph("📈 Pre-Market Futures", section_style))
    
    futures_data = [['Index', 'Price', 'Change', 'Signal']]
    for symbol, data in report.get('futures', {}).items():
        if 'price' in data:
            change_str = f"{data.get('change_percent', 0):+.2f}%"
            futures_data.append([
                data.get('name', symbol),
                f"${data.get('price', 0):,.2f}",
                change_str,
                data.get('signal', 'N/A').upper()
            ])
    
    if len(futures_data) > 1:
        futures_table = Table(futures_data, colWidths=[2.5*inch, 1.5*inch, 1.2*inch, 1*inch])
        futures_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ]))
        elements.append(futures_table)
    
    elements.append(Spacer(1, 15))
    
    # Gap Scanners
    elements.append(Paragraph("🚀 Top Movers (Pre-Market)", section_style))
    
    gaps = report.get('gap_scanners', {})
    
    if gaps.get('gappers_up'):
        elements.append(Paragraph("<b>Gapping UP</b>", normal_style))
        gap_up_data = [['Symbol', 'Gap %', 'Price', 'Volume']]
        for g in gaps['gappers_up'][:5]:
            gap_up_data.append([
                g['symbol'],
                f"+{g['gap_percent']:.1f}%",
                f"${g['current']:.2f}",
                f"{g.get('volume', 0):,}"
            ])
        
        gap_table = Table(gap_up_data, colWidths=[1.2*inch, 1*inch, 1.2*inch, 1.5*inch])
        gap_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#22c55e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (1, 1), (1, -1), colors.HexColor('#22c55e')),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(gap_table)
        elements.append(Spacer(1, 10))
    
    if gaps.get('gappers_down'):
        elements.append(Paragraph("<b>Gapping DOWN</b>", normal_style))
        gap_down_data = [['Symbol', 'Gap %', 'Price', 'Volume']]
        for g in gaps['gappers_down'][:5]:
            gap_down_data.append([
                g['symbol'],
                f"{g['gap_percent']:.1f}%",
                f"${g['current']:.2f}",
                f"{g.get('volume', 0):,}"
            ])
        
        gap_table = Table(gap_down_data, colWidths=[1.2*inch, 1*inch, 1.2*inch, 1.5*inch])
        gap_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (1, 1), (1, -1), colors.HexColor('#ef4444')),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(gap_table)
    
    elements.append(Spacer(1, 15))
    
    # Sector Performance
    elements.append(Paragraph("🏢 Sector Heat Map", section_style))
    
    sector_data = [['Sector', '1-Day', '5-Day', 'Momentum']]
    for symbol, data in list(report.get('sectors', {}).items())[:8]:
        sector_data.append([
            data.get('name', symbol),
            f"{data.get('change_1d', 0):+.2f}%",
            f"{data.get('change_5d', 0):+.2f}%",
            data.get('momentum', 'N/A').upper()
        ])
    
    if len(sector_data) > 1:
        sector_table = Table(sector_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        sector_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(sector_table)
    
    elements.append(Spacer(1, 15))
    
    # Economic Calendar
    economic = report.get('economic_calendar', [])
    if economic:
        elements.append(Paragraph("📅 Economic Events Today", section_style))
        
        for event in economic:
            imp_icon = "⚠️" if event.get('importance') == 'critical' else "📌" if event.get('importance') == 'high' else "📍"
            elements.append(Paragraph(
                f"{imp_icon} <b>{event.get('time', '')}</b>: {event.get('event', '')}",
                normal_style
            ))
        elements.append(Spacer(1, 15))
    
    # Crypto
    elements.append(Paragraph("₿ Cryptocurrency (24H)", section_style))
    
    crypto_data = [['Coin', 'Price', '24H Change']]
    for symbol, data in report.get('crypto', {}).items():
        crypto_data.append([
            data.get('name', symbol),
            f"${data.get('price', 0):,.2f}",
            f"{data.get('change_24h', 0):+.2f}%"
        ])
    
    if len(crypto_data) > 1:
        crypto_table = Table(crypto_data, colWidths=[2*inch, 2*inch, 1.5*inch])
        crypto_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ]))
        elements.append(crypto_table)
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        f"Generated by FinTech Hub at {report.get('generated_at', '')}",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))
    elements.append(Paragraph(
        "⚠️ This report is for informational purposes only and does not constitute financial advice.",
        ParagraphStyle('Disclaimer', parent=styles['Normal'], fontSize=7, textColor=colors.grey, alignment=TA_CENTER)
    ))
    
    # Build PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def generate_html_report(report: Dict) -> str:
    """Generate HTML version of the report (fallback if reportlab not available)"""
    
    sentiment = report.get('executive_summary', {}).get('sentiment', {})
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Morning Trading Report - {report.get('market_date', '')}</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8fafc; }}
            h1 {{ color: #10b981; text-align: center; }}
            h2 {{ color: #1e293b; border-bottom: 2px solid #10b981; padding-bottom: 5px; }}
            .sentiment-box {{ background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0; }}
            table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
            th {{ background: #10b981; color: white; padding: 10px; text-align: left; }}
            td {{ padding: 8px; border-bottom: 1px solid #e2e8f0; }}
            .green {{ color: #22c55e; }}
            .red {{ color: #ef4444; }}
            .footer {{ text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <h1>🌅 Morning Trading Report</h1>
        <p style="text-align: center; color: #64748b;">{report.get('market_date', '')}</p>
        
        <h2>📊 Market Sentiment</h2>
        <div class="sentiment-box">
            <p><strong>Overall:</strong> {sentiment.get('overall', 'N/A').upper()}</p>
            <p><strong>VIX:</strong> {sentiment.get('vix_level', 'N/A')} ({sentiment.get('vix_sentiment', '')})</p>
            <p><strong>Recommendation:</strong> {sentiment.get('recommendation', '')}</p>
        </div>
        
        <h2>📈 Pre-Market Futures</h2>
        <table>
            <tr><th>Index</th><th>Price</th><th>Change</th></tr>
    """
    
    for symbol, data in report.get('futures', {}).items():
        if 'price' in data:
            color_class = 'green' if data.get('change_percent', 0) > 0 else 'red'
            html += f"""
            <tr>
                <td>{data.get('name', symbol)}</td>
                <td>${data.get('price', 0):,.2f}</td>
                <td class="{color_class}">{data.get('change_percent', 0):+.2f}%</td>
            </tr>
            """
    
    html += """
        </table>
        
        <div class="footer">
            <p>Generated by FinTech Hub</p>
            <p>⚠️ This report is for informational purposes only.</p>
        </div>
    </body>
    </html>
    """
    
    return html


def get_report_as_base64(report: Dict) -> str:
    """Get PDF report as base64 string for download"""
    pdf_bytes = generate_morning_report_pdf(report)
    return base64.b64encode(pdf_bytes).decode('utf-8')
