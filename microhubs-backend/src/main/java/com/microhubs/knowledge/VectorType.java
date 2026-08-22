package com.microhubs.knowledge;

import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.ParameterizedType;
import org.hibernate.usertype.UserType;

import java.io.Serializable;
import java.sql.*;
import java.util.Properties;

/**
 * Custom Hibernate UserType for pgvector columns.
 * Maps float[] ↔ PostgreSQL vector(n) using string representation.
 *
 * Uses Types.OTHER so PostgreSQL recognizes the native vector type.
 */
public class VectorType implements UserType<float[]>, ParameterizedType {

    private int dimensions = 1536;

    @Override
    public void setParameterValues(Properties parameters) {
        String dim = parameters.getProperty("dimensions");
        if (dim != null) {
            dimensions = Integer.parseInt(dim);
        }
    }

    @Override
    public int getSqlType() {
        return Types.OTHER;
    }

    @Override
    public Class<float[]> returnedClass() {
        return float[].class;
    }

    @Override
    public boolean equals(float[] x, float[] y) {
        if (x == null && y == null) return true;
        if (x == null || y == null) return false;
        if (x.length != y.length) return false;
        for (int i = 0; i < x.length; i++) {
            if (Float.compare(x[i], y[i]) != 0) return false;
        }
        return true;
    }

    @Override
    public int hashCode(float[] x) {
        if (x == null) return 0;
        int result = 1;
        for (float v : x) {
            result = 31 * result + Float.hashCode(v);
        }
        return result;
    }

    @Override
    public float[] nullSafeGet(ResultSet rs, int position, SharedSessionContractImplementor session, Object owner)
            throws SQLException {
        Object obj = rs.getObject(position);
        if (obj == null) return null;
        // Handle PGobject (pgvector JDBC driver wraps vector columns)
        if (obj.getClass().getName().contains("PGobject") || obj.getClass().getName().contains("PGvector")) {
            try {
                // Try to get the value via reflection
                var valueMethod = obj.getClass().getMethod("getValue");
                Object val = valueMethod.invoke(obj);
                if (val == null) return null;
                return parseVector(val.toString());
            } catch (Exception e) {
                // Fallback: use toString()
                return parseVector(obj.toString());
            }
        }
        return parseVector(obj.toString());
    }

    @Override
    public void nullSafeSet(PreparedStatement st, float[] value, int index, SharedSessionContractImplementor session)
            throws SQLException {
        if (value == null) {
            st.setObject(index, null);
        } else {
            // PostgreSQL pgvector accepts text like '[0.1,0.2,0.3]'
            st.setObject(index, toVectorString(value));
        }
    }

    @Override
    public float[] deepCopy(float[] value) {
        if (value == null) return null;
        float[] copy = new float[value.length];
        System.arraycopy(value, 0, copy, 0, value.length);
        return copy;
    }

    @Override
    public boolean isMutable() {
        return true;
    }

    @Override
    public Serializable disassemble(float[] value) {
        return deepCopy(value);
    }

    @Override
    public float[] assemble(Serializable cached, Object owner) {
        if (cached == null) return null;
        return deepCopy((float[]) cached);
    }

    /**
     * Parse a pgvector text representation like '[0.1,0.2,0.3]' to float[].
     */
    private float[] parseVector(String text) {
        text = text.trim();
        if (text.startsWith("[")) text = text.substring(1);
        if (text.endsWith("]")) text = text.substring(0, text.length() - 1);
        if (text.isEmpty()) return new float[0];

        String[] parts = text.split(",");
        float[] result = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Float.parseFloat(parts[i].trim());
        }
        return result;
    }

    /**
     * Convert float[] to pgvector text representation.
     */
    private String toVectorString(float[] value) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < value.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(value[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}
