"""
Dashboard de Estadísticas StackDo - Streamlit
Visualización de estadísticas por proyecto con gráficos interactivos
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import sys
import os
from sqlmodel import select

# Agregar el módulo api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from api.db import get_session, Project, Tarea, User

# ─────────────────────────────────────────────────────────────
# CONFIGURACIÓN DE PÁGINA
# ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="StackDo - Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilos CSS personalizados
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin: 10px 0;
    }
    .metric-label {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 10px;
    }
    .metric-value {
        font-size: 32px;
        font-weight: bold;
    }
    h1 {
        color: #667eea;
        text-align: center;
        margin-bottom: 30px;
    }
    .sidebar-title {
        color: #667eea;
        font-weight: bold;
        margin-top: 20px;
    }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────
# FUNCIONES DE BASE DE DATOS
# ─────────────────────────────────────────────────────────────

@st.cache_data
def get_projects():
    """Obtiene lista de proyectos"""
    with get_session() as session:
        projects = session.exec(select(Project)).all()
        return [{"id": p.id, "name": p.name, "color": p.color or "#667eea"} for p in projects]

@st.cache_data
def get_tasks_by_project(project_id):
    """Obtiene todas las tareas de un proyecto"""
    with get_session() as session:
        tasks = session.exec(
            select(Tarea).where(
                (Tarea.project_id == project_id) & 
                (Tarea.active == True)
            )
        ).all()
        return tasks

def get_stats_for_project(project_id):
    """Calcula estadísticas para un proyecto"""
    tasks = get_tasks_by_project(project_id)
    
    # Conteo por estado
    estado_counts = {
        "Pendiente": 0,
        "En progreso": 0,
        "Completada": 0
    }
    
    # Conteo por prioridad
    prioridad_counts = {
        "⭐ Muy Baja": 0,
        "⭐⭐ Baja": 0,
        "⭐⭐⭐ Media": 0,
        "⭐⭐⭐⭐ Alta": 0,
        "⭐⭐⭐⭐⭐ Muy Alta": 0
    }
    
    # Timeline (últimos 7 días)
    timeline = {}
    for i in range(7):
        date_key = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        timeline[date_key] = 0
    
    for task in tasks:
        # Estado
        estado_map = {
            "pendiente": "Pendiente",
            "en_progreso": "En progreso",
            "completada": "Completada"
        }
        estado = estado_map.get(task.estado, task.estado)
        if estado in estado_counts:
            estado_counts[estado] += 1
        
        # Prioridad
        prioridad_map = {
            1: "⭐ Muy Baja",
            2: "⭐⭐ Baja",
            3: "⭐⭐⭐ Media",
            4: "⭐⭐⭐⭐ Alta",
            5: "⭐⭐⭐⭐⭐ Muy Alta"
        }
        prioridad = prioridad_map.get(task.prioridad, "Desconocida")
        if prioridad in prioridad_counts:
            prioridad_counts[prioridad] += 1
        
        # Timeline
        if task.fecha_creacion:
            date_key = task.fecha_creacion.strftime("%Y-%m-%d")
            if date_key in timeline:
                timeline[date_key] += 1
    
    return {
        "total_tareas": len(tasks),
        "estado": estado_counts,
        "prioridad": prioridad_counts,
        "timeline": timeline,
        "tareas": tasks
    }

# ─────────────────────────────────────────────────────────────
# INTERFAZ PRINCIPAL
# ─────────────────────────────────────────────────────────────

st.title("📊 StackDo - Dashboard de Estadísticas")

# Sidebar para seleccionar proyecto
st.sidebar.markdown("### 📁 Seleccionar Proyecto")
projects = get_projects()

if not projects:
    st.error("❌ No hay proyectos disponibles. Crea uno primero en la aplicación.")
    st.stop()

project_names = [p["name"] for p in projects]
selected_project = st.sidebar.selectbox("Proyecto", project_names)
selected_project_data = next((p for p in projects if p["name"] == selected_project), None)

if not selected_project_data:
    st.error("Error: Proyecto no encontrado")
    st.stop()

project_id = selected_project_data["id"]
project_color = selected_project_data["color"]

# Obtener estadísticas
stats = get_stats_for_project(project_id)

# ─────────────────────────────────────────────────────────────
# MÉTRICAS PRINCIPALES
# ─────────────────────────────────────────────────────────────

st.markdown(f"### 📈 Resumen - {selected_project}")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="Total de Tareas",
        value=stats["total_tareas"],
        delta=None
    )

with col2:
    st.metric(
        label="Completadas",
        value=stats["estado"]["Completada"],
        delta=f"{int((stats['estado']['Completada'] / max(1, stats['total_tareas'])) * 100)}%"
    )

with col3:
    st.metric(
        label="En Progreso",
        value=stats["estado"]["En progreso"]
    )

with col4:
    st.metric(
        label="Pendientes",
        value=stats["estado"]["Pendiente"]
    )

st.divider()

# ─────────────────────────────────────────────────────────────
# GRÁFICOS
# ─────────────────────────────────────────────────────────────

col1, col2 = st.columns(2)

# Gráfico de ESTADO (Gráfico de Barras)
with col1:
    st.markdown("#### 📊 Tareas por Estado")
    estado_data = stats["estado"]
    
    fig_estado = go.Figure(
        data=[go.Bar(
            x=list(estado_data.keys()),
            y=list(estado_data.values()),
            marker=dict(
                color=["#ffc107", "#0dcaf0", "#198754"]
            ),
            text=list(estado_data.values()),
            textposition="auto",
        )]
    )
    fig_estado.update_layout(
        title=None,
        xaxis_title="Estado",
        yaxis_title="Cantidad",
        hovermode="x unified",
        height=400,
        template="plotly_white"
    )
    st.plotly_chart(fig_estado, use_container_width=True)

# Gráfico de PRIORIDAD (Gráfico de Pastel)
with col2:
    st.markdown("#### 🎯 Tareas por Prioridad")
    prioridad_data = {k: v for k, v in stats["prioridad"].items() if v > 0}
    
    if prioridad_data:
        fig_prioridad = go.Figure(
            data=[go.Pie(
                labels=list(prioridad_data.keys()),
                values=list(prioridad_data.values()),
                hoverinfo="label+value+percent",
                marker=dict(
                    colors=["#28a745", "#17a2b8", "#ffc107", "#fd7e14", "#dc3545"][:len(prioridad_data)]
                )
            )]
        )
        fig_prioridad.update_layout(
            title=None,
            height=400,
            template="plotly_white"
        )
        st.plotly_chart(fig_prioridad, use_container_width=True)
    else:
        st.info("Sin tareas para mostrar gráfico de prioridad")

st.divider()

# ─────────────────────────────────────────────────────────────
# TIMELINE (Últimos 7 días)
# ─────────────────────────────────────────────────────────────

st.markdown("#### 📅 Tareas Creadas (Últimos 7 días)")

timeline_data = stats["timeline"]
timeline_df = pd.DataFrame({
    "Fecha": sorted(timeline_data.keys(), reverse=True),
    "Cantidad": [timeline_data[d] for d in sorted(timeline_data.keys(), reverse=True)]
})

fig_timeline = go.Figure(
    data=[go.Scatter(
        x=timeline_df["Fecha"],
        y=timeline_df["Cantidad"],
        mode="lines+markers",
        name="Tareas",
        line=dict(color=project_color, width=3),
        marker=dict(size=10),
        fill="tozeroy",
        fillcolor=f"rgba({int(project_color[1:3], 16)}, {int(project_color[3:5], 16)}, {int(project_color[5:7], 16)}, 0.2)"
    )]
)
fig_timeline.update_layout(
    title=None,
    xaxis_title="Fecha",
    yaxis_title="Cantidad de Tareas",
    hovermode="x unified",
    height=350,
    template="plotly_white"
)
st.plotly_chart(fig_timeline, use_container_width=True)

st.divider()

# ─────────────────────────────────────────────────────────────
# TABLA DE TAREAS
# ─────────────────────────────────────────────────────────────

st.markdown("#### 📋 Listado de Tareas")

if stats["tareas"]:
    tareas_data = []
    for task in stats["tareas"]:
        estado_map = {
            "pendiente": "⏳ Pendiente",
            "en_progreso": "⚙️ En progreso",
            "completada": "✅ Completada"
        }
        prioridad_stars = "⭐" * task.prioridad
        
        tareas_data.append({
            "ID": task.id,
            "Título": task.titulo,
            "Estado": estado_map.get(task.estado, task.estado),
            "Prioridad": prioridad_stars,
            "Vencimiento": task.fecha_vencimiento.strftime("%d/%m/%Y") if task.fecha_vencimiento else "—",
            "Comentario": task.comentario[:50] + "..." if task.comentario and len(task.comentario) > 50 else (task.comentario or "—")
        })
    
    df_tareas = pd.DataFrame(tareas_data)
    st.dataframe(df_tareas, use_container_width=True, hide_index=True)
else:
    st.info("No hay tareas en este proyecto")

# ─────────────────────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────────────────────

st.divider()
st.markdown("""
<div style='text-align: center; color: #999; font-size: 12px; margin-top: 20px;'>
    <p>StackDo Dashboard • Proyecto: <strong>{}</strong></p>
    <p>Actualizado: {}</p>
</div>
""".format(selected_project, datetime.now().strftime("%d/%m/%Y %H:%M")), unsafe_allow_html=True)
